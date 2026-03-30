from typing import Optional

from django.db import transaction

from apps.authorization.services import AuthorizationService
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
        return queryset.order_by('sort_order', 'name')[:limit]

    @transaction.atomic
    def create(self, data: dict) -> Tag:
        current_module = data.pop('current_module', None)
        extend_scope = data.pop('extend_scope', False)
        data['name'] = data['name'].strip()
        tag_type = data['tag_type']

        if tag_type == 'SPACE':
            data['allow_knowledge'] = True
            data['allow_question'] = True
        else:
            self._apply_scope_defaults(data, current_module)

        existing = Tag.objects.filter(name=data['name'], tag_type=tag_type).first()
        if not existing:
            return Tag.objects.create(**data)

        if tag_type == 'SPACE':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='同名 space 已存在',
            )

        if current_module and not self._is_scope_enabled(existing, current_module):
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

        return existing

    @transaction.atomic
    def update(self, pk: int, data: dict) -> Tag:
        tag = Tag.objects.filter(pk=pk).first()
        self.validate_not_none(tag, f'标签 {pk} 不存在')

        current_module = data.pop('current_module', None)
        if current_module:
            self._enable_scope(tag, current_module)

        for field in ['name', 'color', 'sort_order', 'allow_knowledge', 'allow_question']:
            if field in data:
                setattr(tag, field, data[field])

        if 'name' in data:
            tag.name = tag.name.strip()
            duplicate = Tag.objects.filter(name=tag.name, tag_type=tag.tag_type).exclude(pk=tag.pk).exists()
            if duplicate:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='同类型下标签名称不能重复',
                )

        if tag.tag_type == 'SPACE':
            tag.allow_knowledge = True
            tag.allow_question = True
        elif not tag.allow_knowledge and not tag.allow_question:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='普通标签至少需要适用于知识或题目之一',
            )

        tag.save()
        return tag

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
            if hasattr(tag, 'question_items'):
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
    def _is_scope_enabled(tag: Tag, current_module: str) -> bool:
        if current_module == 'knowledge':
            return tag.allow_knowledge
        if current_module == 'question':
            return tag.allow_question
        return False

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


def enforce_tag_view_permission(
    request,
    error_message='无权查看标签',
    *,
    tag_type: Optional[str] = None,
) -> None:
    authorization_service = AuthorizationService(request)
    if authorization_service.can('tag.view'):
        return
    if (
        tag_type == 'SPACE'
        and authorization_service.can('knowledge.view')
    ):
        return
    raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message=error_message)


def enforce_tag_action_permission(request, permission_code: str, error_message: str) -> None:
    AuthorizationService(request).enforce(permission_code, error_message=error_message)
