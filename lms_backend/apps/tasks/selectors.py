"""
Task selectors.
集中管理任务相关查询，统一预加载与过滤逻辑。
"""
from django.db.models import QuerySet
from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz, KnowledgeLearningProgress


def task_detail_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Task.objects.select_related(
        'created_by'
    ).prefetch_related(
        'task_knowledge__knowledge',
        'task_quizzes__quiz',
        'assignments__assignee'
    )
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def task_base_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Task.objects.select_related('created_by')
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def assignment_detail_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
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
