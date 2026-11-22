"""试卷应用服务。"""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from typing import Any, List, Optional

from apps.activity_logs.decorators import log_content_action
from apps.activity_logs.text import format_number
from django.db import transaction
from django.db.models import Count, DecimalField, IntegerField, OuterRef, QuerySet, Subquery, Sum, Value
from django.db.models.functions import Coalesce

from apps.authorization.engine import get_engine
from apps.questions.models import Question, QuestionOption
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


def validate_exam_pass_score(pass_score: Any, total_score: Any, title: str) -> Decimal:
    """校验考试及格分数必须在 (0, total_score] 范围内。"""
    resolved_pass_score = Decimal(str(pass_score))
    if resolved_pass_score <= 0:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f'考试「{title}」的及格分数必须大于 0',
        )
    resolved_total_score = Decimal(str(total_score or 0))
    if resolved_total_score <= 0 or resolved_pass_score > resolved_total_score:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f'考试「{title}」的及格分数不能超过试卷总分 {resolved_total_score}',
        )
    return resolved_pass_score


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
    # 按 Quiz -> Question(pk 升序) -> QuizQuestion / QuestionOption 顺序加锁，
    # 保证题干、选项和分值全部来自已锁定的最新提交版本，不通过额外普通聚合查询读旧快照。
    quiz = Quiz.objects.select_for_update().get(pk=quiz.pk)
    locked_questions = {
        question.id: question
        for question in Question.objects.select_for_update()
        .filter(pk__in=quiz.quiz_questions.values('question_id'))
        .order_by('pk')
    }
    relations = list(
        quiz.quiz_questions.select_for_update().order_by('order', 'id')
    )
    missing_question_ids = sorted(
        {relation.question_id for relation in relations} - locked_questions.keys()
    )
    if missing_question_ids:
        for question in Question.objects.select_for_update().filter(
            pk__in=missing_question_ids,
        ).order_by('pk'):
            locked_questions[question.id] = question

    options_by_question: dict[int, list[QuestionOption]] = {}
    if locked_questions:
        for option in QuestionOption.objects.select_for_update().filter(
            question_id__in=locked_questions.keys(),
        ).order_by('question_id', 'sort_order', 'id'):
            options_by_question.setdefault(option.question_id, []).append(option)

    total_score = sum((relation.score for relation in relations), Decimal('0'))
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
        resolved_pass_score = validate_exam_pass_score(pass_score, total_score, quiz.title)
    task_quiz = TaskQuiz.objects.create(
        task=task,
        source_quiz=quiz,
        order=order,
        title=quiz.title,
        allow_retry=allow_retry,
        duration=resolved_duration,
        pass_score=resolved_pass_score,
    )
    TaskQuizQuestion.objects.bulk_create(
        [
            TaskQuizQuestion(
                task_quiz=task_quiz,
                content=locked_questions[relation.question_id].content,
                question_type=locked_questions[relation.question_id].question_type,
                reference_answer=locked_questions[relation.question_id].reference_answer,
                explanation=locked_questions[relation.question_id].explanation,
                score=relation.score,
                order=relation.order,
            )
            for relation in relations
        ]
    )
    frozen_questions = list(
        TaskQuizQuestion.objects.filter(task_quiz=task_quiz).order_by('order', 'id')
    )
    frozen_options = [
        TaskQuizQuestionOption(
            question=frozen_question,
            sort_order=option.sort_order,
            content=option.content,
            is_correct=option.is_correct,
        )
        for relation, frozen_question in zip(relations, frozen_questions)
        for option in options_by_question.get(relation.question_id, [])
    ]
    if frozen_options:
        TaskQuizQuestionOption.objects.bulk_create(frozen_options)
    return task_quiz


def annotate_quiz_summary(queryset: QuerySet) -> QuerySet:
    """为试卷查询集注解题目数量与总分。"""
    question_counts = (
        QuizQuestion.objects.filter(quiz_id=OuterRef('pk'))
        .order_by()
        .values('quiz_id')
        .annotate(total=Count('id'))
        .values('total')
    )
    scores = (
        QuizQuestion.objects.filter(quiz_id=OuterRef('pk'))
        .order_by()
        .values('quiz_id')
        .annotate(total=Sum('score'))
        .values('total')
    )
    return queryset.annotate(
        question_count_value=Coalesce(
            Subquery(question_counts, output_field=IntegerField()),
            Value(0),
            output_field=IntegerField(),
        ),
        total_score_value=Coalesce(
            Subquery(scores, output_field=DecimalField(max_digits=10, decimal_places=2)),
            Value(0),
            output_field=DecimalField(max_digits=10, decimal_places=2),
        ),
    )


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
    ) -> QuerySet:
        usage_counts = (
            TaskQuiz.objects.filter(source_quiz_id=OuterRef('pk'))
            .order_by()
            .values('source_quiz_id')
            .annotate(total=Count('task_id', distinct=True))
            .values('total')
        )
        qs = annotate_quiz_summary(
            get_engine(self.request).scope_filter(
                'quizzes.view_quiz',
                base_queryset=Quiz.objects.select_related('created_by', 'updated_by'),
            )
        ).annotate(
            usage_count_value=Coalesce(
                Subquery(usage_counts, output_field=IntegerField()),
                Value(0),
                output_field=IntegerField(),
            ),
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
        return qs

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
        return self.get_by_id(quiz.id)

    @transaction.atomic
    @log_content_action(
        'quiz',
        'update',
        _quiz_log_description,
        group='试卷',
        label='更新试卷',
    )
    def update(self, pk: int, data: dict, questions: List[dict] = None) -> Quiz:
        Quiz.objects.select_for_update(of=('self',)).filter(pk=pk).only('id').first()
        quiz = self.get_by_id(pk)
        changed_fields = {
            field: value
            for field, value in data.items()
            if field in self.BASE_FIELDS and getattr(quiz, field, None) != value
        }
        if changed_fields or questions is not None:
            changed_fields['updated_by'] = self.user
            for key, value in changed_fields.items():
                setattr(quiz, key, value)
            quiz.save(update_fields=[*changed_fields.keys(), 'updated_at'])
        if questions is not None:
            self._sync_quiz_questions(quiz, questions)
        return self.get_by_id(quiz.id)

    @transaction.atomic
    @log_content_action(
        'quiz',
        'delete',
        _quiz_log_description,
        group='试卷',
        label='删除试卷',
    )
    def delete(self, pk: int) -> SimpleNamespace:
        quiz = self.get_by_id(pk)
        snapshot = SimpleNamespace(
            id=quiz.id,
            title=quiz.title,
            question_count=quiz.question_count,
            total_score=quiz.total_score,
        )
        quiz.delete()
        return snapshot

    def _sync_quiz_questions(self, quiz: Quiz, question_payloads: List[dict[str, Any]]) -> None:
        existing_relations = {
            relation.id: relation
            for relation in quiz.quiz_questions.select_related('question')
        }
        resolved_items: list[tuple[dict[str, Any], Optional[int]]] = []
        referenced_question_ids: list[int] = []
        for raw_item in question_payloads:
            item = dict(raw_item)
            relation_id = item.get('id')
            relation = existing_relations.get(relation_id) if relation_id is not None else None
            if relation_id is not None and relation is None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_INPUT,
                    message=f'试卷题目 {relation_id} 不存在或不属于当前试卷',
                )
            question_id = item.get('source_question_id') or (relation.question_id if relation else None)
            if question_id is not None:
                referenced_question_ids.append(question_id)
            resolved_items.append((item, question_id))

        questions_by_id = (
            {
                q.id: q
                for q in get_engine(self.request).scope_filter(
                    'questions.view_question',
                    base_queryset=Question.objects.select_for_update(of=('self',))
                    .filter(id__in=set(referenced_question_ids))
                    .order_by('pk'),
                )
            }
            if referenced_question_ids
            else {}
        )

        new_relations = []
        for order, (item, question_id) in enumerate(resolved_items, start=1):
            if question_id is None:
                question = self.question_service.create(item)
            else:
                question = questions_by_id.get(question_id)
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
