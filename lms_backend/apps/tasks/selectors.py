"""任务 QuerySet：只负责高效加载对象。"""

from typing import Optional, Set

from django.db.models import Count, Q, QuerySet, Sum

from apps.authorization.engine import scope_filter
from apps.knowledge.selectors import get_knowledge_queryset
from apps.quizzes.models import Quiz

from .models import KnowledgeLearningProgress, Task, TaskAssignment, TaskKnowledge, TaskQuiz


def task_detail_queryset() -> QuerySet:
    return Task.objects.select_related('created_by', 'updated_by').prefetch_related(
        'task_knowledge__knowledge',
        'task_knowledge__source_knowledge',
        'task_quizzes__quiz',
        'task_quizzes__source_quiz',
        'assignments__assignee',
    )


def task_list_queryset() -> QuerySet:
    return Task.objects.select_related('created_by', 'updated_by').annotate(
        knowledge_count_value=Count('task_knowledge', distinct=True),
        quiz_count_value=Count('task_quizzes', distinct=True),
        exam_count_value=Count(
            'task_quizzes',
            filter=Q(task_quizzes__quiz__quiz_type='EXAM'),
            distinct=True,
        ),
        practice_count_value=Count(
            'task_quizzes',
            filter=Q(task_quizzes__quiz__quiz_type='PRACTICE'),
            distinct=True,
        ),
        assignee_count_value=Count('assignments', distinct=True),
        completed_count_value=Count(
            'assignments',
            filter=Q(assignments__status='COMPLETED'),
            distinct=True,
        ),
        pending_grading_count_value=Count(
            'assignments__submissions',
            filter=Q(assignments__submissions__status='GRADING'),
            distinct=True,
        ),
    )


def assignment_detail_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee',
    ).prefetch_related(
        'task__task_knowledge__knowledge',
        'task__task_quizzes__quiz',
        'knowledge_progress__task_knowledge__knowledge',
    )


def assignment_list_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee',
    ).prefetch_related(
        'task__task_knowledge__knowledge',
        'task__task_quizzes',
        'knowledge_progress',
    )


def task_knowledge_queryset(task_id: int) -> QuerySet:
    return TaskKnowledge.objects.filter(task_id=task_id).select_related(
        'knowledge',
        'source_knowledge',
        'task',
    ).order_by('order')


def task_quiz_queryset(task_id: int) -> QuerySet:
    return (
        TaskQuiz.objects.filter(task_id=task_id)
        .select_related('quiz', 'source_quiz', 'task')
        .annotate(
            question_count_value=Count('quiz__quiz_questions', distinct=True),
            total_score_value=Sum('quiz__quiz_questions__score'),
        )
        .order_by('order')
    )


def knowledge_progress_queryset(assignment_id: int) -> QuerySet:
    return KnowledgeLearningProgress.objects.filter(assignment_id=assignment_id).select_related(
        'task_knowledge',
        'task_knowledge__knowledge',
    ).order_by('task_knowledge__order')


def document_resource_option_queryset(
    *,
    request,
    search: Optional[str] = None,
    exclude_ids: Optional[Set[int]] = None,
) -> QuerySet:
    queryset = get_knowledge_queryset(search=search, ordering='-updated_at')
    queryset = scope_filter('knowledge.view', request, base_queryset=queryset)
    if exclude_ids:
        queryset = queryset.exclude(id__in=exclude_ids)
    return queryset.select_related('space_tag')


def quiz_resource_option_queryset(
    *,
    request,
    search: Optional[str] = None,
    exclude_ids: Optional[Set[int]] = None,
    quiz_type: Optional[str] = None,
) -> QuerySet:
    queryset = scope_filter(
        'quiz.view',
        request,
        base_queryset=Quiz.objects.all(),
    ).annotate(question_count_value=Count('quiz_questions'))
    if exclude_ids:
        queryset = queryset.exclude(id__in=exclude_ids)
    if quiz_type:
        queryset = queryset.filter(quiz_type=quiz_type)
    if search:
        queryset = queryset.filter(title__icontains=search)
    return queryset.order_by('-updated_at')
