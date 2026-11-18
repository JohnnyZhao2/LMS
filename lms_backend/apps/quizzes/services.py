"""试卷应用服务。"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, List, Optional

from apps.activity_logs.decorators import log_content_action
from apps.activity_logs.text import format_number
from django.db import transaction
from django.db.models import Count, DecimalField, OuterRef, Subquery, Sum, Value
from django.db.models.functions import Coalesce

from apps.authorization.engine import get_engine
from apps.questions.models import Question
from apps.questions.services import QuestionService
from apps.tasks.models import TaskQuiz
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import (
    Quiz,
    QuizQuestion,
    TaskQuizQuestion,
    TaskQuizQuestionOption,
)


@transaction.atomic
def freeze_quiz_for_task(
    quiz: Quiz,
    *,
    task,
    order: int,
    allow_retry: bool,
    duration: Optional[int] = None,
    pass_score: Optional[Decimal] = None,
) -> TaskQuiz:
    quiz = Quiz.objects.select_for_update().get(pk=quiz.pk)
    # 题干与选项必须来自同一次编辑完成后的内容。
    list(Question.objects.select_for_update().filter(
        pk__in=quiz.quiz_questions.values('question_id'),
    ).order_by('pk'))
    if allow_retry:
        resolved_duration = None
        resolved_pass_score = None
    else:
        if not duration or int(duration) <= 0:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'考试「{quiz.title}」必须设置参考时间',
            )
        if pass_score is None:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'考试「{quiz.title}」必须设置及格分数',
            )
        resolved_duration = int(duration)
        resolved_pass_score = Decimal(str(pass_score))
        total_score = Decimal(str(quiz.total_score or 0))
        if resolved_pass_score <= 0:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'考试「{quiz.title}」的及格分数必须大于 0',
            )
        if total_score > 0 and resolved_pass_score > total_score:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'考试「{quiz.title}」的及格分数不能超过试卷总分 {total_score}',
            )
    task_quiz = TaskQuiz.objects.create(
        task=task,
        source_quiz=quiz,
        order=order,
        title=quiz.title,
        allow_retry=allow_retry,
        duration=resolved_duration,
        pass_score=resolved_pass_score,
    )
    for relation in quiz.quiz_questions.select_related('question').prefetch_related(
        'question__question_options',
    ).order_by('order', 'id'):
        question = relation.question
        frozen_question = TaskQuizQuestion.objects.create(
            task_quiz=task_quiz,
            content=question.content,
            question_type=question.question_type,
            reference_answer=question.reference_answer,
            explanation=question.explanation,
            score=relation.score,
            order=relation.order,
        )
        TaskQuizQuestionOption.objects.bulk_create(
            [
                TaskQuizQuestionOption(
                    question=frozen_question,
                    sort_order=option.sort_order,
                    content=option.content,
                    is_correct=option.is_correct,
                )
                for option in question.question_options.all().order_by('sort_order', 'id')
            ]
        )
    return task_quiz


def _quiz_log_description(ctx: dict) -> str:
    quiz = ctx['result']
    return f'{quiz.question_count} 题，{format_number(quiz.total_score)} 分'


class QuizService(BaseService):
    """试卷应用服务。"""

    BASE_FIELDS = ['title']

    def __init__(self, request):
        super().__init__(request)
        self.question_service = QuestionService(request)

    def get_by_id(self, pk: int) -> Quiz:
        queryset = Quiz.objects.select_related('created_by', 'updated_by').prefetch_related(
            'quiz_questions__question__question_options',
            'quiz_questions__question__tags',
            'quiz_questions__question__space_tag',
        )
        quiz = get_engine(self.request).scope_filter('quizzes.view_quiz', base_queryset=queryset).filter(pk=pk).first()
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
        scores = QuizQuestion.objects.filter(quiz_id=OuterRef('pk')).order_by().values('quiz_id').annotate(
            total=Sum('score'),
        ).values('total')
        qs = get_engine(self.request).scope_filter('quizzes.view_quiz',
            base_queryset=Quiz.objects.select_related('created_by', 'updated_by'),
        ).annotate(
            question_count_value=Count('quiz_questions', distinct=True),
            total_score_value=Coalesce(
                Subquery(scores, output_field=DecimalField(max_digits=10, decimal_places=2)),
                Value(0),
                output_field=DecimalField(max_digits=10, decimal_places=2),
            ),
            usage_count_value=Count('task_bindings__task_id', distinct=True),
        )
        if filters:
            if filters.get('created_by_id'):
                qs = qs.filter(created_by_id=filters['created_by_id'])
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
        _quiz_log_description,
        group='试卷',
        label='创建试卷',
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
        _quiz_log_description,
        group='试卷',
        label='更新试卷',
    )
    def update(self, pk: int, data: dict, questions: List[dict] = None) -> Quiz:
        Quiz.objects.select_for_update().get(pk=pk)
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
        _quiz_log_description,
        group='试卷',
        label='删除试卷',
    )
    def delete(self, pk: int) -> Quiz:
        quiz = self.get_by_id(pk)
        quiz.delete()
        return quiz

    def _sync_quiz_questions(self, quiz: Quiz, question_payloads: List[dict[str, Any]]) -> None:
        existing_relations = {
            relation.id: relation
            for relation in quiz.quiz_questions.select_related('question')
        }
        new_relations = []
        for order, raw_item in enumerate(question_payloads, start=1):
            item = dict(raw_item)
            relation_id = item.get('id')
            relation = existing_relations.get(relation_id) if relation_id is not None else None
            if relation_id is not None and relation is None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_INPUT,
                    message=f'试卷题目 {relation_id} 不存在或不属于当前试卷',
                )
            question_id = item.get('source_question_id') or (relation.question_id if relation else None)
            if question_id is None:
                question = self.question_service.create(item)
            else:
                question = get_engine(self.request).scope_filter(
                    'questions.view_question', base_queryset=Question.objects.all(),
                ).filter(pk=question_id).first()
                if question is None:
                    raise BusinessError(code=ErrorCodes.RESOURCE_NOT_FOUND, message=f'题目 {question_id} 不存在')
                if item.get('question_changes'):
                    question = self.question_service.update(question.id, item['question_changes'])
            new_relations.append(QuizQuestion(
                quiz=quiz,
                question=question,
                score=item['score'],
                order=order,
            ))

        quiz.quiz_questions.all().delete()
        QuizQuestion.objects.bulk_create(new_relations)
