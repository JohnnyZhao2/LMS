"""
Dashboard selectors.
集中管理仪表盘读模型查询与统计。
"""
from typing import List, Dict, Any, Optional
from django.db.models import QuerySet, Avg
from apps.tasks.models import TaskAssignment
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission


def get_pending_tasks(user_id: int, limit: int = 10) -> QuerySet:
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
        status='IN_PROGRESS',
        task__is_deleted=False,
        task__is_closed=False
    ).select_related(
        'task', 'task__created_by'
    ).prefetch_related(
        'task__task_knowledge',
        'task__task_quizzes',
        'knowledge_progress'
    ).order_by('task__deadline')[:limit]


def get_latest_knowledge(limit: int = 5) -> QuerySet:
    return Knowledge.objects.filter(
        is_deleted=False
    ).select_related(
        'created_by', 'updated_by'
    ).order_by('-created_at')[:limit]


def get_student_assignments(
    user_id: int,
    task_deleted: bool = False
) -> QuerySet:
    qs = TaskAssignment.objects.filter(assignee_id=user_id)
    if not task_deleted:
        qs = qs.filter(task__is_deleted=False)
    return qs


def get_assignments_by_students(
    student_ids: List[int],
    task_deleted: bool = False
) -> QuerySet:
    qs = TaskAssignment.objects.filter(assignee_id__in=student_ids)
    if not task_deleted:
        qs = qs.filter(task__is_deleted=False)
    return qs.select_related('task')


def calculate_task_stats(assignments: QuerySet) -> Dict[str, Any]:
    total_tasks = assignments.count()
    completed_tasks = assignments.filter(status='COMPLETED').count()
    in_progress_tasks = assignments.filter(status='IN_PROGRESS').count()
    overdue_tasks = assignments.filter(status='OVERDUE').count()
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
    return {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'in_progress_tasks': in_progress_tasks,
        'overdue_tasks': overdue_tasks,
        'completion_rate': round(completion_rate, 1)
    }


def calculate_avg_score(
    student_ids: Optional[List[int]] = None,
    user_id: Optional[int] = None,
    task_deleted: bool = False
) -> Optional[float]:
    qs = Submission.objects.filter(status='GRADED')
    if not task_deleted:
        qs = qs.filter(task_assignment__task__is_deleted=False)
    if student_ids:
        qs = qs.filter(user_id__in=student_ids)
    elif user_id:
        qs = qs.filter(user_id=user_id)
    result = qs.aggregate(avg_score=Avg('obtained_score'))
    return float(result['avg_score']) if result['avg_score'] else None
