"""
Task selectors.
集中管理任务相关查询，统一预加载与过滤逻辑。
"""
from django.db.models import Count, Max, Prefetch, QuerySet, Sum

from apps.submissions.models import Submission

from .models import (
    KnowledgeLearningProgress,
    Task,
    TaskAssignment,
    TaskKnowledge,
    TaskQuiz,
)

ANALYTICS_SUBMISSION_STATUSES = ['SUBMITTED', 'GRADING', 'GRADED']
ACCURACY_SUBMISSION_STATUSES = ['SUBMITTED', 'GRADED']


def task_detail_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Task.objects.select_related(
        'created_by',
        'updated_by'
    ).prefetch_related(
        'task_knowledge__knowledge',
        'task_quizzes__quiz',
        'assignments__assignee'
    )
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def task_base_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Task.objects.select_related('created_by', 'updated_by')
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def assignment_detail_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee'
    ).prefetch_related(
        'task__task_knowledge__knowledge',
        'task__task_quizzes__quiz',
        'knowledge_progress__task_knowledge__knowledge'
    )


def assignment_list_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee'
    ).prefetch_related(
        'task__task_knowledge',
        'task__task_quizzes',
        'knowledge_progress'
    )


def task_knowledge_queryset(task_id: int) -> QuerySet:
    return TaskKnowledge.objects.filter(
        task_id=task_id
    ).select_related('knowledge', 'task').order_by('order')


def task_quiz_queryset(task_id: int) -> QuerySet:
    return TaskQuiz.objects.filter(
        task_id=task_id
    ).select_related('quiz', 'task').order_by('order')


def knowledge_progress_queryset(assignment_id: int) -> QuerySet:
    return KnowledgeLearningProgress.objects.filter(
        assignment_id=assignment_id
    ).select_related(
        'task_knowledge',
        'task_knowledge__knowledge'
    ).order_by('task_knowledge__order')


def analytics_assignment_queryset(task_id: int, order_desc: bool = False) -> QuerySet:
    submissions_prefetch = Prefetch(
        'submissions',
        queryset=Submission.objects.select_related('quiz').filter(
            status__in=ANALYTICS_SUBMISSION_STATUSES
        )
    )
    queryset = TaskAssignment.objects.filter(task_id=task_id).select_related(
        'assignee',
        'assignee__department',
        'task',
    ).prefetch_related(
        'knowledge_progress',
        submissions_prefetch,
    )
    if order_desc:
        return queryset.order_by('-created_at')
    return queryset


def task_submission_score_totals(task_id: int) -> dict:
    totals = Submission.objects.filter(
        task_assignment__task_id=task_id,
        status__in=ACCURACY_SUBMISSION_STATUSES,
    ).aggregate(
        total_score=Sum('total_score'),
        obtained_score=Sum('obtained_score'),
        submission_count=Count('id'),
    )
    return {
        'total_score': totals['total_score'] or 0,
        'obtained_score': totals['obtained_score'] or 0,
        'submission_count': totals['submission_count'] or 0,
    }


def task_knowledge_completion_counts(task_id: int) -> dict[int, int]:
    rows = KnowledgeLearningProgress.objects.filter(
        task_knowledge__task_id=task_id,
        is_completed=True,
    ).values('task_knowledge_id').annotate(
        completed_count=Count('id')
    )
    return {row['task_knowledge_id']: row['completed_count'] for row in rows}


def task_quiz_completion_counts(task_id: int) -> dict[int, int]:
    rows = Submission.objects.filter(
        task_assignment__task_id=task_id,
        status__in=ANALYTICS_SUBMISSION_STATUSES,
    ).values('quiz_id').annotate(
        completed_count=Count('task_assignment_id', distinct=True)
    )
    return {row['quiz_id']: row['completed_count'] for row in rows}


def task_exam_highest_scores(task_id: int) -> list:
    return list(
        Submission.objects.filter(
            task_assignment__task_id=task_id,
            quiz__quiz_type='EXAM',
            status__in=ANALYTICS_SUBMISSION_STATUSES,
            obtained_score__isnull=False,
        ).values('task_assignment_id').annotate(
            max_obtained=Max('obtained_score')
        ).values_list('max_obtained', flat=True)
    )


def task_exam_submissions_queryset(task_id: int) -> QuerySet:
    return Submission.objects.filter(
        task_assignment__task_id=task_id,
        quiz__quiz_type='EXAM',
        status__in=ANALYTICS_SUBMISSION_STATUSES,
        obtained_score__isnull=False,
    ).select_related('quiz')
