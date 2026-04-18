"""试卷应用服务。"""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from typing import Any, List

from apps.activity_logs.decorators import log_content_action
from django.db import transaction
from django.db.models import Count, DecimalField, Sum, Value
from django.db.models.functions import Coalesce

from apps.questions.models import Question
from apps.questions.services import QuestionService
from apps.tags.models import Tag
from apps.tags.resource_sync import apply_resource_tag_changes
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import (
    Quiz,
    QuizQuestion,
    QuizQuestionOption,
    QuizRevision,
    QuizRevisionQuestion,
    QuizRevisionQuestionOption,
)


def build_quiz_revision_payload(quiz: Quiz) -> dict:
    question_rows = []
    for relation in quiz.quiz_questions.prefetch_related('question_options').order_by('order', 'id'):
        question_rows.append(
            {
                'source_question_id': relation.question_id,
                'content': relation.content,
                'question_type': relation.question_type,
                'reference_answer': relation.reference_answer,
                'explanation': relation.explanation,
                'score': str(relation.score),
                'order': relation.order,
                'space_tag_name': relation.space_tag_name,
                'tags_json': relation.tags_json,
                'options': [
                    {
                        'sort_order': option.sort_order,
                        'content': option.content,
                        'is_correct': option.is_correct,
                    }
                    for option in relation.question_options.all().order_by('sort_order', 'id')
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

    def __init__(self, request):
        super().__init__(request)
        self.question_service = QuestionService(request)

    def get_by_id(self, pk: int) -> Quiz:
        quiz = Quiz.objects.select_related('created_by', 'updated_by').prefetch_related(
            'quiz_questions__question_options',
        ).filter(pk=pk).first()
        self.validate_not_none(quiz, f'试卷 {pk} 不存在')
        return quiz

    def get_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-updated_at',
        limit: int = None,
        offset: int = None,
    ) -> List[Quiz]:
        qs = Quiz.objects.select_related('created_by', 'updated_by').annotate(
            question_count_value=Count('quiz_questions', distinct=True),
            total_score_value=Coalesce(
                Sum(
                    'quiz_questions__score',
                    output_field=DecimalField(max_digits=10, decimal_places=2),
                ),
                Value(0),
                output_field=DecimalField(max_digits=10, decimal_places=2),
            ),
            usage_count_value=Count('task_bindings__task_id', distinct=True),
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
        if limit:
            qs = qs[offset:offset + limit] if offset else qs[:limit]
        return list(qs)

    @transaction.atomic
    @log_content_action(
        'quiz',
        'create',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
    )
    def create(self, data: dict, questions: List[dict] = None) -> Quiz:
        payload = dict(data)
        payload['created_by'] = self.user
        payload['updated_by'] = self.user
        quiz = Quiz.objects.create(**payload)
        self._sync_quiz_questions(quiz, questions or [])
        quiz.refresh_from_db()
        return quiz

    @transaction.atomic
    @log_content_action(
        'quiz',
        'update',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
    )
    def update(self, pk: int, data: dict, questions: List[dict] = None) -> Quiz:
        quiz = self.get_by_id(pk)
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
        quiz.refresh_from_db()
        return quiz

    @transaction.atomic
    @log_content_action(
        'quiz',
        'delete',
        '{quiz_type_label}，{question_count} 题，{total_score_text} 分',
    )
    def delete(self, pk: int) -> Quiz:
        quiz = self.get_by_id(pk)
        stale_question_ids = list(quiz.quiz_questions.values_list('id', flat=True))
        stale_revision_ids = list(quiz.revisions.filter(quiz_tasks__isnull=True).values_list('id', flat=True))
        stale_source_question_ids = [
            relation.question_id
            for relation in quiz.quiz_questions.select_related('question')
            if relation.question_id
        ]
        for relation in list(quiz.quiz_questions.select_related('question')):
            self._cleanup_orphan_source_question(relation, deleting_relation=True)
        quiz.delete()
        if stale_revision_ids:
            QuizRevision.objects.filter(id__in=stale_revision_ids).delete()
        QuizQuestionOption.objects.filter(question_id__in=stale_question_ids).delete()
        for question in Question.objects.filter(id__in=stale_source_question_ids):
            if question.quiz_copies.exists():
                continue
            if question.quiz_revision_entries.exists():
                continue
            question.delete()
        return quiz

    def _sync_quiz_questions(self, quiz: Quiz, question_payloads: List[dict[str, Any]]) -> None:
        existing_relations = {
            relation.id: relation
            for relation in quiz.quiz_questions.select_related('question').prefetch_related('question_options')
        }
        keep_ids: list[int] = []
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

            source_question = self._resolve_source_question(quiz, relation, item)
            copy_fields, option_defs = self._build_quiz_question_storage(item, source_question, order)

            if relation is None:
                relation = QuizQuestion.objects.create(
                    quiz=quiz,
                    question=source_question,
                    **copy_fields,
                )
            else:
                for key, value in copy_fields.items():
                    setattr(relation, key, value)
                relation.question = source_question
                relation.save()

            self._sync_quiz_question_options(relation, option_defs)
            keep_ids.append(relation.id)

        stale_relations = list(quiz.quiz_questions.exclude(id__in=keep_ids).select_related('question'))
        for relation in stale_relations:
            self._cleanup_orphan_source_question(relation, deleting_relation=True)
            relation.delete()

    def _resolve_source_question(
        self,
        quiz: Quiz,
        relation: QuizQuestion | None,
        item: dict[str, Any],
    ) -> Question | None:
        source_question_id = item.get('source_question_id')
        if source_question_id is not None:
            source_question = Question.objects.filter(pk=source_question_id).first()
            if source_question is None:
                raise BusinessError(
                    code=ErrorCodes.RESOURCE_NOT_FOUND,
                    message=f'题目 {source_question_id} 不存在',
                )
            return source_question

        if relation and relation.question_id:
            return relation.question

        return self._create_bank_question_from_quiz(quiz, item)

    def _create_bank_question_from_quiz(self, quiz: Quiz, item: dict[str, Any]) -> Question:
        merged_payload = self.question_service._build_merged_question_payload(item)
        question_data, option_defs = self.question_service._build_storage_payload(merged_payload)
        question = Question.objects.create(
            **question_data,
            created_by=self.user,
            updated_by=self.user,
            created_from_quiz=quiz,
        )
        self.question_service._sync_question_options(question, option_defs)
        apply_resource_tag_changes(
            question,
            space_tag_id=item.get('space_tag_id'),
            tag_ids=item.get('tag_ids', []),
            space_tag_provided='space_tag_id' in item,
            tag_ids_provided='tag_ids' in item,
        )
        return question

    def _build_quiz_question_storage(
        self,
        item: dict[str, Any],
        source_question: Question | None,
        order: int,
    ) -> tuple[dict, list[dict]]:
        merged_payload = self.question_service._build_merged_question_payload(item, source=source_question)
        question_data, option_defs = self.question_service._build_storage_payload(merged_payload)
        tag_ids = item.get(
            'tag_ids',
            list(source_question.tags.values_list('id', flat=True)) if source_question else [],
        )
        space_tag_id = item.get('space_tag_id', source_question.space_tag_id if source_question else None)
        return (
            {
                **question_data,
                'order': order,
                'space_tag_name': self._resolve_space_tag_name(space_tag_id, source_question),
                'tags_json': self._resolve_tags_json(tag_ids, source_question),
            },
            option_defs,
        )

    def _resolve_space_tag_name(self, space_tag_id, source_question: Question | None) -> str:
        if space_tag_id is None:
            return source_question.space_tag.name if source_question and source_question.space_tag else ''
        return Tag.objects.filter(id=space_tag_id, tag_type='SPACE').values_list('name', flat=True).first() or ''

    def _resolve_tags_json(self, tag_ids: list[int], source_question: Question | None) -> list[dict]:
        if not tag_ids and source_question:
            return [
                {'id': tag.id, 'name': tag.name, 'tag_type': tag.tag_type}
                for tag in source_question.tags.order_by('id')
            ]
        return [
            {'id': tag.id, 'name': tag.name, 'tag_type': tag.tag_type}
            for tag in Tag.objects.filter(id__in=tag_ids).order_by('id')
        ]

    def _sync_quiz_question_options(self, relation: QuizQuestion, option_defs: list[dict]) -> None:
        relation.question_options.all().delete()
        prefetched_cache = getattr(relation, '_prefetched_objects_cache', None)
        if prefetched_cache is not None:
            prefetched_cache.pop('question_options', None)
        if not option_defs:
            return
        QuizQuestionOption.objects.bulk_create(
            [
                QuizQuestionOption(
                    question=relation,
                    sort_order=option_def['sort_order'],
                    content=option_def['content'],
                    is_correct=option_def['is_correct'],
                )
                for option_def in option_defs
            ]
        )

    def _cleanup_orphan_source_question(
        self,
        relation: QuizQuestion,
        *,
        deleting_relation: bool = False,
    ) -> None:
        source_question = relation.question
        if not source_question or source_question.created_from_quiz_id != relation.quiz_id:
            return
        remaining_copies = source_question.quiz_copies.exclude(id=relation.id if deleting_relation else None).exists()
        if remaining_copies:
            return
        if source_question.quiz_revision_entries.exists():
            return
        source_question.delete()
