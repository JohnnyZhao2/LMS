"""题目应用服务。"""

import json
from typing import Optional

from django.db import transaction

from apps.activity_logs.decorators import log_content_action
from apps.authorization.engine import enforce
from apps.tags.resource_sync import (
    apply_resource_tag_changes,
    pop_resource_tag_payload,
)
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import Question, QuestionOption
from .question_like import DEFAULT_QUESTION_SCORE
from .selectors import (
    apply_question_filters,
    get_question_by_id,
    question_base_queryset,
)


class QuestionService(BaseService):
    """题目应用服务。"""

    def get_by_id(self, pk: int) -> Question:
        question = get_question_by_id(pk)
        self.validate_not_none(question, f'题目 {pk} 不存在')
        return question

    def get_queryset(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
    ):
        queryset = question_base_queryset()
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
        self.validate_question_payload(payload)
        tag_payload = pop_resource_tag_payload(payload, scope='question')
        question_data, option_defs = self._build_storage_payload(
            self._build_merged_question_payload(payload)
        )
        question = Question.objects.create(
            **question_data,
            created_by=self.user,
            updated_by=self.user,
        )
        self._sync_question_options(question, option_defs)
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
        question = self.get_by_id(pk)
        enforce('question.update', self.request, error_message='无权编辑此题目')

        payload = dict(data)
        self.validate_question_payload(payload, source=question)
        current_tag_ids = self._list_question_tag_ids(question)
        tag_payload = pop_resource_tag_payload(
            payload,
            scope='question',
            default_space_tag_id=question.space_tag_id,
            default_tag_ids=current_tag_ids,
        )
        merged_payload = self._build_merged_question_payload(payload, source=question)
        has_content_changes = self._has_question_content_changes(question, merged_payload)
        space_changed = (
            tag_payload.space_tag_provided
            and tag_payload.space_tag_id != question.space_tag_id
        )
        tags_changed = (
            tag_payload.tag_ids_provided
            and set(tag_payload.tag_ids) != set(current_tag_ids)
        )
        if not has_content_changes and not space_changed and not tags_changed:
            return question

        model_payload, option_defs = self._build_storage_payload(merged_payload)
        changed_fields = {
            field: value
            for field, value in model_payload.items()
            if getattr(question, field) != value
        }
        if changed_fields:
            changed_fields['updated_by'] = self.user
            for key, value in changed_fields.items():
                setattr(question, key, value)
            question.save(update_fields=list(changed_fields.keys()))
        if has_content_changes:
            self._sync_question_options(question, option_defs)

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
        question = self.get_by_id(pk)
        enforce('question.delete', self.request, error_message='无权删除此题目')
        question.delete()
        return question

    @classmethod
    def validate_question_ids(cls, question_ids: list[int]) -> None:
        if not question_ids:
            return
        existing_ids = set(Question.objects.filter(id__in=question_ids).values_list('id', flat=True))
        invalid_ids = sorted(set(question_ids) - existing_ids)
        if invalid_ids:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'题目不存在: {invalid_ids}',
            )

    @classmethod
    def validate_question_payload(
        cls,
        data: dict,
        *,
        source: Optional[Question] = None,
    ) -> None:
        merged_data = {
            'question_type': data.get('question_type', source.question_type if source else None),
            'options': data.get('options', source.options if source else []),
            'answer': data.get('answer', source.answer if source else None),
        }
        cls._validate_question_content(merged_data)

    @classmethod
    def _validate_question_content(cls, data: dict) -> None:
        question_type = data.get('question_type')
        options = data.get('options', [])
        answer = data.get('answer')

        if question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE']:
            if not options:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='选择题必须设置选项',
                )

            option_keys = []
            for opt in options:
                if not isinstance(opt, dict) or 'key' not in opt or 'value' not in opt:
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='选项格式错误，必须包含 key 和 value',
                    )
                if not str(opt['value']).strip():
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='选项内容不能为空',
                    )
                option_keys.append(opt['key'])

            if len(option_keys) != len(set(option_keys)):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='选项 key 不能重复',
                )

            if question_type == 'SINGLE_CHOICE':
                if not isinstance(answer, str):
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='单选题答案必须是字符串',
                    )
                if answer not in option_keys:
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='单选题答案必须是有效的选项',
                    )
            else:
                if not isinstance(answer, list):
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='多选题答案必须是列表',
                    )
                for ans in answer:
                    if ans not in option_keys:
                        raise BusinessError(
                            code=ErrorCodes.VALIDATION_ERROR,
                            message=f'多选题答案 {ans} 不是有效的选项',
                        )
        elif question_type == 'TRUE_FALSE':
            if answer not in ['TRUE', 'FALSE']:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='判断题答案必须是 TRUE 或 FALSE',
                )
        elif question_type == 'SHORT_ANSWER':
            if not isinstance(answer, str):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='简答题答案必须是字符串',
                )

    def _build_merged_question_payload(
        self,
        data: dict,
        *,
        source: Optional[Question] = None,
    ) -> dict:
        return {
            'content': data.get('content', source.content if source else ''),
            'question_type': data.get('question_type', source.question_type if source else None),
            'options': data.get('options', source.options if source else []),
            'answer': data.get('answer', source.answer if source else None),
            'explanation': data.get('explanation', source.explanation if source else ''),
            'score': data.get('score', source.score if source else DEFAULT_QUESTION_SCORE),
        }

    def _build_storage_payload(self, merged_payload: dict) -> tuple[dict, list[dict]]:
        question_type = merged_payload['question_type']
        answer = merged_payload.get('answer')
        return (
            {
                'content': merged_payload['content'],
                'question_type': question_type,
                'reference_answer': answer if question_type == 'SHORT_ANSWER' else '',
                'explanation': merged_payload.get('explanation', ''),
                'score': merged_payload.get('score', DEFAULT_QUESTION_SCORE),
            },
            self._build_option_definitions(
                question_type=question_type,
                options=merged_payload.get('options', []),
                answer=answer,
            ),
        )

    def _build_option_definitions(
        self,
        *,
        question_type: str,
        options: list[dict],
        answer,
    ) -> list[dict]:
        if question_type == 'SHORT_ANSWER':
            return []
        if question_type == 'TRUE_FALSE':
            label_map = {
                opt['key']: opt['value']
                for opt in options
                if isinstance(opt, dict) and opt.get('key') in {'TRUE', 'FALSE'}
            }
            return [
                {
                    'sort_order': 1,
                    'content': label_map.get('TRUE') or '正确',
                    'is_correct': answer == 'TRUE',
                },
                {
                    'sort_order': 2,
                    'content': label_map.get('FALSE') or '错误',
                    'is_correct': answer == 'FALSE',
                },
            ]
        correct_keys = {answer} if question_type == 'SINGLE_CHOICE' else set(answer or [])
        return [
            {
                'sort_order': index + 1,
                'content': str(option['value']).strip(),
                'is_correct': option['key'] in correct_keys,
            }
            for index, option in enumerate(options)
        ]

    def _serialize_question_payload(self, question: Question) -> dict:
        return {
            'content': question.content,
            'question_type': question.question_type,
            'options': question.options,
            'answer': question.answer,
            'explanation': question.explanation,
            'score': question.score,
        }

    def _has_question_content_changes(self, question: Question, merged_payload: dict) -> bool:
        current_payload = self._serialize_question_payload(question)
        comparable_current = {**current_payload, 'score': str(current_payload['score'])}
        comparable_next = {**merged_payload, 'score': str(merged_payload['score'])}
        return json.dumps(comparable_current, sort_keys=True, default=str) != json.dumps(
            comparable_next,
            sort_keys=True,
            default=str,
        )

    def _sync_question_options(self, question: Question, option_defs: list[dict]) -> None:
        question.question_options.all().delete()
        prefetched_cache = getattr(question, '_prefetched_objects_cache', None)
        if prefetched_cache is not None:
            prefetched_cache.pop('question_options', None)
        if not option_defs:
            return
        QuestionOption.objects.bulk_create(
            [
                QuestionOption(
                    question=question,
                    sort_order=option_def['sort_order'],
                    content=option_def['content'],
                    is_correct=option_def['is_correct'],
                )
                for option_def in option_defs
            ]
        )

    def _list_question_tag_ids(self, question: Question) -> list[int]:
        return list(question.tags.values_list('id', flat=True))
