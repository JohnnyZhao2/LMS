"""
Dashboard selectors.
集中管理仪表盘读模型查询与统计。
"""
from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db.models import Avg, QuerySet
from django.utils import timezone

from apps.activity_logs.models import UserLog
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission
from apps.tasks.models import TaskAssignment
from apps.users.models import User


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


def get_latest_knowledge(limit: int = 6) -> QuerySet:
    return Knowledge.objects.filter(
        is_deleted=False,
        is_current=True
    ).select_related(
        'created_by', 'updated_by'
    ).order_by('-updated_at')[:limit]


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


def get_weekly_active_users_count(user_ids: List[int]) -> int:
    if not user_ids:
        return 0
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_date = today - timedelta(days=today.weekday())
    start_dt = datetime.combine(start_date, time.min)
    end_dt = start_dt + timedelta(days=7)
    if settings.USE_TZ:
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(start_dt, tz)
        end_dt = timezone.make_aware(end_dt, tz)
    active_user_ids = UserLog.objects.filter(
        user_id__in=user_ids,
        action='login',
        status='success',
        created_at__gte=start_dt,
        created_at__lt=end_dt
    ).values_list('user_id', flat=True).distinct()
    return User.objects.filter(
        id__in=active_user_ids,
        is_active=True
    ).count()


def get_monthly_tasks_count() -> int:
    """获取本月发布的任务数量"""
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_of_month = today.replace(day=1)
    start_dt = datetime.combine(start_of_month, time.min)
    if settings.USE_TZ:
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(start_dt, tz)

    from apps.tasks.models import Task
    return Task.objects.filter(
        is_deleted=False,
        created_at__gte=start_dt
    ).count()
