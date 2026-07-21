from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db.models import Avg, QuerySet
from django.utils import timezone

from apps.activity_logs.models import ActivityLog
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission


def get_latest_knowledge(limit: int = 6) -> QuerySet:
    return (
        Knowledge.objects
        .select_related('created_by', 'updated_by', 'space_tag')
        .defer('content')
        .order_by('-updated_at')[:limit]
    )


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
        'completion_rate': round(completion_rate, 1),
    }


def calculate_avg_score(
    student_ids: Optional[List[int]] = None,
    user_id: Optional[int] = None,
) -> Optional[float]:
    qs = Submission.objects.filter(status='GRADED')
    if student_ids:
        qs = qs.filter(user_id__in=student_ids)
    elif user_id:
        qs = qs.filter(user_id=user_id)
    result = qs.aggregate(avg_score=Avg('obtained_score'))
    return float(result['avg_score']) if result['avg_score'] is not None else None


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
    active_user_ids = ActivityLog.objects.filter(
        category='user',
        actor_id__in=user_ids,
        action='login',
        status='success',
        created_at__gte=start_dt,
        created_at__lt=end_dt,
    ).values_list('actor_id', flat=True).distinct()
    return len(active_user_ids)


def get_month_start_datetime() -> datetime:
    if settings.USE_TZ:
        today = timezone.localdate()
    else:
        today = datetime.now().date()
    start_of_month = today.replace(day=1)
    start_dt = datetime.combine(start_of_month, time.min)
    if settings.USE_TZ:
        tz = timezone.get_current_timezone()
        start_dt = timezone.make_aware(start_dt, tz)
    return start_dt


def get_monthly_tasks_count() -> int:
    from apps.tasks.models import Task

    return Task.objects.filter(created_at__gte=get_month_start_datetime()).count()
