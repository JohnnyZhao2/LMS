from typing import List, Optional

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from apps.authorization.engine import authorize, enforce
from apps.knowledge.models import Knowledge
from apps.questions.models import Question
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import Tag


class TagService(BaseService):
    def list(self, *, tag_type=None, search=None, applicable_to=None, limit=50):
        queryset = Tag.objects.all()
        if tag_type:
            queryset = queryset.filter(tag_type=tag_type)
        if applicable_to == 'knowledge':
            queryset = queryset.filter(allow_knowledge=True)
        elif applicable_to == 'question':
            queryset = queryset.filter(allow_question=True)
        if search:
            queryset = queryset.filter(name__icontains=search)
        if tag_type == 'SPACE':
            return queryset.order_by('sort_order', 'name')[:limit]
        return queryset.order_by('name')[:limit]

    @transaction.atomic
    def create(self, data: dict) -> Tag:
        current_module = data.pop('current_module', None)
        extend_scope = data.pop('extend_scope', False)
        data['name'] = data['name'].strip()
        tag_type = data['tag_type']
        cross_type_duplicate = Tag.objects.filter(name=data['name']).exclude(tag_type=tag_type).first()
        if cross_type_duplicate:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='标签名称不能与其他类型重复',
            )

        if tag_type == 'SPACE':
            data['allow_knowledge'] = True
            data['allow_question'] = True
        else:
            self._apply_scope_defaults(data, current_module)
            data['sort_order'] = 0

        existing = Tag.objects.filter(name=data['name'], tag_type=tag_type).first()
        if existing:
            return self._reuse_existing_tag(
                existing=existing,
                tag_type=tag_type,
                current_module=current_module,
                extend_scope=extend_scope,
            )

        try:
            return Tag.objects.create(**data)
        except (ValidationError, IntegrityError) as error:
            # 并发下可能在查询后到创建前被同名插入，此处回查并走统一复用逻辑。
            existing_after_conflict = Tag.objects.filter(name=data['name'], tag_type=tag_type).first()
            if existing_after_conflict:
                return self._reuse_existing_tag(
                    existing=existing_after_conflict,
                    tag_type=tag_type,
                    current_module=current_module,
                    extend_scope=extend_scope,
                )
            self._raise_validation_error(error if isinstance(error, ValidationError) else ValidationError(str(error)))

    @transaction.atomic
    def update(self, pk: int, data: dict) -> Tag:
        tag = Tag.objects.filter(pk=pk).first()
        self.validate_not_none(tag, f'标签 {pk} 不存在')

        current_module = data.pop('current_module', None)
        if current_module:
            self._enable_scope(tag, current_module)

        if 'name' in data:
            data['name'] = data['name'].strip()
            duplicate = Tag.objects.filter(name=data['name']).exclude(pk=tag.pk).exists()
            if duplicate:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='标签名称不能与其他类型重复',
                )

        next_tag_type = data.get('tag_type', tag.tag_type)
        if next_tag_type not in {'SPACE', 'TAG'}:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='无效的标签类型',
            )

        if next_tag_type == 'SPACE':
            self._apply_space_fields(tag, data)
        else:
            self._apply_tag_fields(tag, data)

        original_tag_type = tag.tag_type
        tag.tag_type = next_tag_type

        if tag.tag_type == 'SPACE':
            tag.allow_knowledge = True
            tag.allow_question = True
        elif not tag.allow_knowledge and not tag.allow_question:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='普通标签至少需要适用于知识或题目之一',
            )
        elif tag.sort_order != 0:
            tag.sort_order = 0

        try:
            tag.save()
        except ValidationError as error:
            self._raise_validation_error(error)

        if original_tag_type != next_tag_type:
            if next_tag_type == 'SPACE':
                self._migrate_tag_relations_to_space(tag)
            else:
                self._migrate_space_relations_to_tag(tag)
        return tag

    @transaction.atomic
    def merge(self, source_tag_ids: List[int], merged_name: str) -> Tag:
        normalized_source_ids = [tag_id for tag_id in source_tag_ids if tag_id]
        if len(normalized_source_ids) < 2:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='至少选择两个标签才能合并',
            )

        tags_by_id = Tag.objects.in_bulk(normalized_source_ids)
        missing_ids = [tag_id for tag_id in normalized_source_ids if tag_id not in tags_by_id]
        if missing_ids:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'标签 {missing_ids[0]} 不存在',
            )

        ordered_tags = [tags_by_id[tag_id] for tag_id in normalized_source_ids]
        tag_types = {tag.tag_type for tag in ordered_tags}
        if len(tag_types) != 1:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='仅支持同类型标签合并，请先改类型',
            )

        merged_name = merged_name.strip()
        if not merged_name:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='合并后的标签名称不能为空',
            )

        existing_conflict = Tag.objects.filter(name=merged_name).exclude(id__in=normalized_source_ids).first()
        if existing_conflict:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='合并后的标签名称已存在',
            )

        target = next((tag for tag in ordered_tags if tag.name == merged_name), ordered_tags[0])
        source_tags = [tag for tag in ordered_tags if tag.id != target.id]

        if target.tag_type == 'SPACE':
            for source in source_tags:
                Knowledge.objects.filter(space_tag_id=source.id).update(space_tag=target)
                Question.objects.filter(space_tag_id=source.id).update(space_tag=target)
        else:
            for source in source_tags:
                target.allow_knowledge = target.allow_knowledge or source.allow_knowledge
                target.allow_question = target.allow_question or source.allow_question

                for knowledge in source.knowledge_items.all():
                    knowledge.tags.add(target)
                for question in source.question_items.all():
                    question.tags.add(target)
                source.knowledge_items.clear()
                source.question_items.clear()

        for source in source_tags:
            source.delete()

        target.name = merged_name
        if target.tag_type == 'TAG':
            target.sort_order = 0
        try:
            target.save()
        except ValidationError as error:
            self._raise_validation_error(error)
        return target

    @transaction.atomic
    def delete(self, pk: int) -> Tag:
        tag = Tag.objects.filter(pk=pk).first()
        self.validate_not_none(tag, f'标签 {pk} 不存在')

        if tag.tag_type == 'SPACE':
            from apps.knowledge.models import Knowledge

            Knowledge.objects.filter(space_tag_id=tag.id).update(space_tag=None)
            Question.objects.filter(space_tag_id=tag.id).update(space_tag=None)
        else:
            tag.knowledge_items.clear()
            tag.question_items.clear()

        tag.delete()
        return tag

    @staticmethod
    def _apply_scope_defaults(data: dict, current_module: Optional[str]) -> None:
        allow_knowledge = data.get('allow_knowledge')
        allow_question = data.get('allow_question')

        if allow_knowledge is None and allow_question is None:
            if current_module == 'question':
                data['allow_knowledge'] = False
                data['allow_question'] = True
            else:
                data['allow_knowledge'] = True
                data['allow_question'] = False
            return

        data['allow_knowledge'] = bool(allow_knowledge)
        data['allow_question'] = bool(allow_question)

    @staticmethod
    def _enable_scope(tag: Tag, current_module: str) -> None:
        updated_fields = []
        if current_module == 'knowledge' and not tag.allow_knowledge:
            tag.allow_knowledge = True
            updated_fields.append('allow_knowledge')
        if current_module == 'question' and not tag.allow_question:
            tag.allow_question = True
            updated_fields.append('allow_question')
        if updated_fields:
            tag.save(update_fields=updated_fields)

    def _reuse_existing_tag(
        self,
        *,
        existing: Tag,
        tag_type: str,
        current_module: Optional[str],
        extend_scope: bool,
    ) -> Tag:
        if tag_type == 'SPACE':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='同名 space 已存在',
            )

        is_scope_enabled = (
            existing.allow_knowledge if current_module == 'knowledge'
            else existing.allow_question if current_module == 'question'
            else False
        )
        if current_module and not is_scope_enabled:
            if not extend_scope:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='已存在同名标签，可扩展适用范围后复用',
                    details={
                        'existing_tag_id': existing.id,
                        'requires_scope_extension': True,
                        'allow_knowledge': existing.allow_knowledge,
                        'allow_question': existing.allow_question,
                    },
                )
            self._enable_scope(existing, current_module)

        return existing

    def _apply_space_fields(self, tag: Tag, data: dict) -> None:
        if 'name' in data:
            tag.name = data['name']
        if 'color' in data:
            tag.color = data['color']
        if 'sort_order' in data:
            tag.sort_order = data['sort_order']

    def _apply_tag_fields(self, tag: Tag, data: dict) -> None:
        if 'name' in data:
            tag.name = data['name']
        if 'color' in data and data['color']:
            tag.color = data['color']
        if 'allow_knowledge' in data:
            tag.allow_knowledge = data['allow_knowledge']
        elif tag.tag_type == 'SPACE':
            tag.allow_knowledge = False
        if 'allow_question' in data:
            tag.allow_question = data['allow_question']
        elif tag.tag_type == 'SPACE':
            tag.allow_question = False
        tag.sort_order = 0

    def _migrate_tag_relations_to_space(self, tag: Tag) -> None:
        conflicting_knowledge_count = tag.knowledge_items.exclude(space_tag_id__isnull=True).count()
        conflicting_question_count = tag.question_items.exclude(space_tag_id__isnull=True).count()
        if conflicting_knowledge_count or conflicting_question_count:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='该普通标签下已有知识或题目绑定了其他 space，无法直接改为 space',
                details={
                    'conflicting_knowledge_count': conflicting_knowledge_count,
                    'conflicting_question_count': conflicting_question_count,
                },
            )

        knowledge_ids = list(tag.knowledge_items.values_list('id', flat=True))
        question_ids = list(tag.question_items.values_list('id', flat=True))
        if knowledge_ids:
            Knowledge.objects.filter(id__in=knowledge_ids).update(space_tag=tag)
        if question_ids:
            Question.objects.filter(id__in=question_ids).update(space_tag=tag)
        tag.knowledge_items.clear()
        tag.question_items.clear()

    def _migrate_space_relations_to_tag(self, tag: Tag) -> None:
        knowledge_items = list(Knowledge.objects.filter(space_tag_id=tag.id))
        question_items = list(Question.objects.filter(space_tag_id=tag.id))

        if knowledge_items:
            tag.allow_knowledge = True
        if question_items:
            tag.allow_question = True
        if not tag.allow_knowledge and not tag.allow_question:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='普通标签至少需要适用于知识或题目之一',
            )
        tag.save(update_fields=['allow_knowledge', 'allow_question'])

        for knowledge in knowledge_items:
            knowledge.tags.add(tag)
        for question in question_items:
            question.tags.add(tag)

        if knowledge_items:
            Knowledge.objects.filter(id__in=[item.id for item in knowledge_items]).update(space_tag=None)
        if question_items:
            Question.objects.filter(id__in=[item.id for item in question_items]).update(space_tag=None)

    @staticmethod
    def _raise_validation_error(error: ValidationError) -> None:
        message = error.messages[0] if getattr(error, 'messages', None) else str(error)
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=message,
        )


def enforce_tag_view_permission(
    request,
    error_message='无权查看标签',
    *,
    tag_type: Optional[str] = None,
) -> None:
    if authorize('tag.view', request).allowed:
        return
    if (
        tag_type == 'SPACE'
        and authorize('knowledge.view', request).allowed
    ):
        return
    raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message=error_message)


def enforce_tag_action_permission(request, permission_code: str, error_message: str) -> None:
    enforce(permission_code, request, error_message=error_message)
