"""题目应用服务。"""

from django.db import transaction

from apps.activity_logs.decorators import log_content_action
from apps.authorization.engine import enforce, scope_filter
from apps.tags.resource_tags import (
    apply_resource_tag_changes,
    pop_resource_tag_payload,
)
from core.base_service import BaseService

from .models import Question
from .payload import (
    build_merged_question_payload,
    build_storage_payload,
    current_model_fields,
    current_option_definitions,
    sync_question_options,
    validate_question_payload,
)
from .selectors import (
    apply_question_filters,
    question_base_queryset,
)


class QuestionService(BaseService):
    """题目应用服务。"""

    def _get_raw_by_id(self, pk: int) -> Question:
        question = question_base_queryset().filter(pk=pk).first()
        self.validate_not_none(question, f'题目 {pk} 不存在')
        return question

    def get_by_id(self, pk: int) -> Question:
        return self.get_for_permission(pk, 'question.view')

    def get_for_permission(self, pk: int, permission_code: str) -> Question:
        question = self._get_raw_by_id(pk)
        enforce(permission_code, self.request, resource=question, error_message='无权操作此题目')
        return question

    def get_queryset(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
    ):
        queryset = scope_filter('question.view', self.request, base_queryset=question_base_queryset())
        queryset = apply_question_filters(queryset, filters or {}, search)
        if ordering:
            queryset = queryset.order_by(ordering)
        return queryset

    @transaction.atomic
    @log_content_action(
        'question',
        'create',
        '{question_type_label}，{score_text} 分',
        group='题目',
        label='创建题目',
    )
    def create(self, data: dict) -> Question:
        payload = dict(data)
        validate_question_payload(payload)
        tag_payload = pop_resource_tag_payload(payload, scope='question')
        question_data, option_defs = build_storage_payload(
            build_merged_question_payload(payload)
        )
        question = Question.objects.create(
            **question_data,
            created_by=self.user,
            updated_by=self.user,
        )
        sync_question_options(question, option_defs)
        apply_resource_tag_changes(
            question,
            space_tag_id=tag_payload.space_tag_id,
            tag_ids=tag_payload.tag_ids,
            space_tag_provided=True,
            tag_ids_provided=True,
        )
        return question

    @transaction.atomic
    @log_content_action(
        'question',
        'update',
        '{question_identity}，{question_update_summary}',
        group='题目',
        label='更新题目',
    )
    def update(self, pk: int, data: dict) -> Question:
        question = self._get_raw_by_id(pk)
        enforce('question.update', self.request, resource=question, error_message='无权编辑此题目')

        payload = dict(data)
        validate_question_payload(payload, source=question)
        current_tag_ids = list(question.tags.values_list('id', flat=True))
        tag_payload = pop_resource_tag_payload(
            payload,
            scope='question',
            default_space_tag_id=question.space_tag_id,
            default_tag_ids=current_tag_ids,
        )
        merged_payload = build_merged_question_payload(payload, source=question)
        model_fields, option_defs = build_storage_payload(merged_payload)

        model_changed = model_fields != current_model_fields(question)
        options_changed = option_defs != current_option_definitions(question)
        space_changed = (
            tag_payload.space_tag_provided
            and tag_payload.space_tag_id != question.space_tag_id
        )
        tags_changed = (
            tag_payload.tag_ids_provided
            and set(tag_payload.tag_ids) != set(current_tag_ids)
        )
        if not model_changed and not options_changed and not space_changed and not tags_changed:
            return question

        if model_changed:
            for key, value in model_fields.items():
                setattr(question, key, value)
            question.updated_by = self.user
            question.save(update_fields=[*model_fields.keys(), 'updated_by'])

        if options_changed:
            sync_question_options(question, option_defs)

        apply_resource_tag_changes(
            question,
            space_tag_id=tag_payload.space_tag_id,
            tag_ids=tag_payload.tag_ids,
            space_tag_provided=space_changed,
            tag_ids_provided=tags_changed,
        )
        return question

    @transaction.atomic
    @log_content_action(
        'question',
        'delete',
        '{question_type_label}，{score_text} 分',
        group='题目',
        label='删除题目',
    )
    def delete(self, pk: int) -> Question:
        question = self._get_raw_by_id(pk)
        enforce('question.delete', self.request, resource=question, error_message='无权删除此题目')
        question.delete()
        return question
