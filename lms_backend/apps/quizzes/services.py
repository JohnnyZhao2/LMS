"""试卷应用服务。"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any, List

from apps.activity_logs.decorators import log_content_action
from django.db import transaction
from django.db.models import Count, DecimalField, IntegerField, OuterRef, Prefetch, QuerySet, Subquery, Sum, Value
from django.db.models.functions import Coalesce

from apps.authorization.engine import enforce, scope_filter
from apps.questions.models import Question
from apps.questions.payload import (
    build_merged_question_payload,
    build_storage_payload,
    current_model_fields,
    current_option_definitions,
    sync_question_options,
    validate_question_payload,
)
from apps.tags.resource_tags import (
    apply_resource_tag_changes,
    pop_resource_tag_payload,
)
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import (
    Quiz,
    QuizQuestion,
    QuizRevision,
    QuizRevisionQuestion,
    QuizRevisionQuestionOption,
)

TEMP_ORDER_BASE = 1_000_000


def build_quiz_revision_payload(quiz: Quiz) -> dict:
    """从当前试卷关系读取题库题内容，生成 revision payload。"""
    question_rows = []
    relations = (
        quiz.quiz_questions.select_related('question__space_tag')
        .prefetch_related('question__question_options', 'question__tags')
        .order_by('order', 'id')
    )
    for relation in relations:
        question = relation.question
        question_rows.append(
            {
                'source_question_id': question.id,
                'content': question.content,
                'question_type': question.question_type,
                'reference_answer': question.reference_answer,
                'explanation': question.explanation,
                'score': str(question.score),
                'order': relation.order,
                'space_tag_name': question.space_tag.name if question.space_tag_id else '',
                'tags_json': [
                    {'id': tag.id, 'name': tag.name, 'tag_type': tag.tag_type}
                    for tag in question.tags.order_by('id')
                ],
                'options': [
                    {
                        'sort_order': option.sort_order,
                        'content': option.content,
                        'is_correct': option.is_correct,
                    }
                    for option in question._ordered_options()
                ],
            }
        )
    return {
        'title': quiz.title,
        'quiz_type': quiz.quiz_type,
        'duration': quiz.duration,
        'pass_score': str(quiz.pass_score) if quiz.pass_score is not None else None,
        'questions': question_rows,
    }


def build_quiz_revision_hash(payload: dict) -> str:
    normalized = json.dumps(payload, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def ensure_quiz_revision(quiz: Quiz, *, actor) -> QuizRevision:
    payload = build_quiz_revision_payload(quiz)
    structure_hash = build_quiz_revision_hash(payload)
    latest = QuizRevision.objects.filter(source_quiz=quiz).order_by('-revision_number').first()
    if latest and latest.structure_hash == structure_hash:
        return latest

    next_revision_number = (latest.revision_number if latest else 0) + 1
    revision = QuizRevision.objects.create(
        source_quiz=quiz,
        revision_number=next_revision_number,
        title=payload['title'],
        quiz_type=payload['quiz_type'],
        duration=payload['duration'],
        pass_score=payload['pass_score'],
        structure_hash=structure_hash,
        created_by=actor,
    )
    for question_payload in payload['questions']:
        revision_question = QuizRevisionQuestion.objects.create(
            quiz=revision,
            question_id=question_payload['source_question_id'],
            content=question_payload['content'],
            question_type=question_payload['question_type'],
            reference_answer=question_payload['reference_answer'],
            explanation=question_payload['explanation'],
            score=question_payload['score'],
            order=question_payload['order'],
            space_tag_name=question_payload['space_tag_name'],
            tags_json=question_payload['tags_json'],
        )
        QuizRevisionQuestionOption.objects.bulk_create(
            [
                QuizRevisionQuestionOption(
                    question=revision_question,
                    sort_order=option['sort_order'],
                    content=option['content'],
                    is_correct=option['is_correct'],
                )
                for option in question_payload['options']
            ]
        )
    return revision


class QuizService(BaseService):
    """试卷应用服务。"""

    BASE_FIELDS = ['title', 'quiz_type', 'duration', 'pass_score']

    def _quiz_detail_queryset(self) -> QuerySet:
        return Quiz.objects.select_related('created_by', 'updated_by').prefetch_related(
            Prefetch(
                'quiz_questions',
                queryset=QuizQuestion.objects.select_related(
                    'question__space_tag',
                    'question__created_by',
                    'question__updated_by',
                ).prefetch_related(
                    'question__question_options',
                    'question__tags',
                ).order_by('order', 'id'),
            ),
        )

    def _get_raw_by_id(self, pk: int) -> Quiz:
        quiz = self._quiz_detail_queryset().filter(pk=pk).first()
        self.validate_not_none(quiz, f'试卷 {pk} 不存在')
        return quiz

    def get_for_permission(self, pk: int, permission_code: str) -> Quiz:
        quiz = self._get_raw_by_id(pk)
        enforce(permission_code, self.request, resource=quiz, error_message='无权操作此试卷')
        return quiz

    def get_by_id(self, pk: int) -> Quiz:
        return self.get_for_permission(pk, 'quiz.view')

    def get_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-updated_at',
    ) -> QuerySet:
        from apps.tasks.models import TaskQuiz

        score_field = DecimalField(max_digits=10, decimal_places=2)
        question_stats = QuizQuestion.objects.filter(quiz_id=OuterRef('pk')).values('quiz_id').annotate(
            question_count=Count('id'),
            total_score=Sum('question__score', output_field=score_field),
        )
        usage_stats = TaskQuiz.objects.filter(source_quiz_id=OuterRef('pk')).values('source_quiz_id').annotate(
            usage_count=Count('task_id', distinct=True),
        )
        qs = scope_filter(
            'quiz.view',
            self.request,
            base_queryset=Quiz.objects.select_related('created_by', 'updated_by'),
        ).annotate(
            question_count_value=Coalesce(
                Subquery(question_stats.values('question_count')[:1], output_field=IntegerField()),
                Value(0),
                output_field=IntegerField(),
            ),
            total_score_value=Coalesce(
                Subquery(question_stats.values('total_score')[:1], output_field=score_field),
                Value(Decimal('0')),
                output_field=score_field,
            ),
            usage_count_value=Coalesce(
                Subquery(usage_stats.values('usage_count')[:1], output_field=IntegerField()),
                Value(0),
                output_field=IntegerField(),
            ),
        )
        if filters:
            if filters.get('created_by_id'):
                qs = qs.filter(created_by_id=filters['created_by_id'])
            if filters.get('quiz_type'):
                qs = qs.filter(quiz_type=filters['quiz_type'])
        if search:
            qs = qs.filter(title__icontains=search)
        if ordering:
            qs = qs.order_by(ordering)
        return qs

    @transaction.atomic
    @log_content_action(
        'quiz',
        'create',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
        group='试卷',
        label='创建试卷',
    )
    def create(self, data: dict, questions: List[dict] = None) -> Quiz:
        payload = dict(data)
        payload['created_by'] = self.user
        payload['updated_by'] = self.user
        quiz = Quiz.objects.create(**payload)
        self._sync_quiz_questions(quiz, questions or [])
        return self._get_raw_by_id(quiz.id)

    @transaction.atomic
    @log_content_action(
        'quiz',
        'update',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
        group='试卷',
        label='更新试卷',
    )
    def update(self, pk: int, data: dict, questions: List[dict] = None) -> Quiz:
        quiz = self.get_for_permission(pk, 'quiz.update')
        changed_fields = {
            field: value
            for field, value in data.items()
            if field in self.BASE_FIELDS and getattr(quiz, field, None) != value
        }
        if changed_fields:
            changed_fields['updated_by'] = self.user
            for key, value in changed_fields.items():
                setattr(quiz, key, value)
            quiz.save(update_fields=list(changed_fields.keys()))
        if questions is not None:
            self._sync_quiz_questions(quiz, questions)
        return self._get_raw_by_id(quiz.id)

    @transaction.atomic
    @log_content_action(
        'quiz',
        'delete',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
        group='试卷',
        label='删除试卷',
    )
    def delete(self, pk: int) -> Quiz:
        quiz = self.get_for_permission(pk, 'quiz.delete')
        stale_revision_ids = list(quiz.revisions.filter(quiz_tasks__isnull=True).values_list('id', flat=True))
        quiz.delete()
        if stale_revision_ids:
            QuizRevision.objects.filter(id__in=stale_revision_ids).delete()
        return quiz

    def _sync_quiz_questions(self, quiz: Quiz, question_payloads: List[dict[str, Any]]) -> None:
        existing_relations = {
            relation.id: relation
            for relation in quiz.quiz_questions.select_related(
                'question__space_tag',
            ).prefetch_related('question__question_options', 'question__tags')
        }
        prepared: list[tuple[QuizQuestion | None, Question, int]] = []
        for order, raw_item in enumerate(question_payloads, start=1):
            item = dict(raw_item)
            relation_id = item.get('id')
            relation = None
            if relation_id is not None:
                relation = existing_relations.get(relation_id)
                if relation is None:
                    raise BusinessError(
                        code=ErrorCodes.INVALID_INPUT,
                        message=f'试卷题目 {relation_id} 不存在或不属于当前试卷',
                    )

            bound_question = self._resolve_bound_question(relation, item)
            prepared.append((relation, bound_question, order))

        keep_ids = [relation.id for relation, _, _ in prepared if relation is not None]
        stale_relations = list(quiz.quiz_questions.exclude(id__in=keep_ids))
        for relation in stale_relations:
            relation.delete()

        # 先整体挪到临时 order，避免 (quiz, order) 唯一约束冲突
        active_relations = [relation for relation, _, _ in prepared if relation is not None]
        for index, relation in enumerate(active_relations):
            relation.order = TEMP_ORDER_BASE + index
        if active_relations:
            QuizQuestion.objects.bulk_update(active_relations, ['order'])

        for relation, bound_question, order in prepared:
            if relation is None:
                QuizQuestion.objects.create(
                    quiz=quiz,
                    question=bound_question,
                    order=order,
                )
                continue
            update_fields = []
            if relation.question_id != bound_question.id:
                relation.question = bound_question
                update_fields.append('question')
            if relation.order != order:
                relation.order = order
                update_fields.append('order')
            if update_fields:
                relation.save(update_fields=update_fields)

    def _resolve_bound_question(
        self,
        relation: QuizQuestion | None,
        item: dict[str, Any],
    ) -> Question:
        """解析本卷应绑定的题目：未改则复用；改了则写时复制或原地更新。"""
        base_question = self._load_base_question(relation, item)
        validate_question_payload(item, source=base_question)

        tag_defaults = (
            list(base_question.tags.values_list('id', flat=True)) if base_question else []
        )
        space_default = base_question.space_tag_id if base_question else None
        working = dict(item)
        tag_payload = pop_resource_tag_payload(
            working,
            scope='question',
            default_space_tag_id=space_default,
            default_tag_ids=tag_defaults,
        )
        model_fields, option_defs = build_storage_payload(
            build_merged_question_payload(working, source=base_question)
        )

        if base_question is None:
            return self._create_question(model_fields, option_defs, tag_payload)

        content_changed = (
            model_fields != current_model_fields(base_question)
            or option_defs != current_option_definitions(base_question)
        )
        space_changed = tag_payload.space_tag_id != base_question.space_tag_id
        current_tag_ids = set(base_question.tags.values_list('id', flat=True))
        tags_changed = set(tag_payload.tag_ids) != current_tag_ids

        if not content_changed and not space_changed and not tags_changed:
            return base_question

        shared = base_question.quiz_relations.exclude(
            id=relation.id if relation else None,
        ).exists()
        if shared:
            return self._create_question(model_fields, option_defs, tag_payload)

        if content_changed:
            for key, value in model_fields.items():
                setattr(base_question, key, value)
            base_question.updated_by = self.user
            base_question.save(update_fields=[*model_fields.keys(), 'updated_by'])
            sync_question_options(base_question, option_defs)

        apply_resource_tag_changes(
            base_question,
            space_tag_id=tag_payload.space_tag_id,
            tag_ids=tag_payload.tag_ids,
            space_tag_provided=space_changed,
            tag_ids_provided=tags_changed,
        )
        return base_question

    def _load_base_question(
        self,
        relation: QuizQuestion | None,
        item: dict[str, Any],
    ) -> Question | None:
        # 已有关系以当前绑定题为准，避免 COW 后客户端仍带旧 source_question_id
        if relation is not None:
            return relation.question

        source_question_id = item.get('source_question_id')
        if source_question_id is None:
            return None

        source_question = scope_filter(
            'question.view',
            self.request,
            base_queryset=Question.objects.prefetch_related('question_options', 'tags'),
        ).select_related('space_tag').filter(pk=source_question_id).first()
        if source_question is None:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'题目 {source_question_id} 不存在',
            )
        return source_question

    def _create_question(self, model_fields: dict, option_defs: list[dict], tag_payload) -> Question:
        question = Question.objects.create(
            **model_fields,
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
