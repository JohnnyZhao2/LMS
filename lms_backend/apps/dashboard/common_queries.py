from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Avg, Count, Q, QuerySet
from django.utils import timezone

from apps.activity_logs.models import ActivityLog
from apps.knowledge.models import Knowledge
from apps.submissions.models import Submission
from apps.tasks.models import TaskAssignment
from apps.tasks.selectors import get_pending_grading_assignment_ids


def get_latest_knowledge(limit: int = 6) -> QuerySet:
    return Knowledge.objects.select_related('created_by', 'updated_by', 'space_tag').order_by('-updated_at')[:limit]


def calculate_task_stats(assignments: QuerySet) -> Dict[str, Any]:
    now = timezone.now()
    overdue_filter = Q(status='OVERDUE') | Q(status='IN_PROGRESS', task__deadline__lt=now)
    overdue_grading_candidate_ids = list(
        assignments.filter(overdue_filter)
        .filter(submissions__status='GRADING')
        .values_list('id', flat=True)
        .distinct()
    )
    pending_grading_ids = get_pending_grading_assignment_ids(overdue_grading_candidate_ids)
    in_progress_filter = Q(status='IN_PROGRESS', task__deadline__gte=now)
    if pending_grading_ids:
        overdue_filter &= ~Q(id__in=pending_grading_ids)
        in_progress_filter |= Q(id__in=pending_grading_ids)

    agg = assignments.aggregate(
        total_tasks=Count('id'),
        completed_tasks=Count('id', filter=Q(status='COMPLETED')),
        in_progress_tasks=Count('id', filter=in_progress_filter),
        overdue_tasks=Count('id', filter=overdue_filter),
    )
    total_tasks = agg['total_tasks']
    completed_tasks = agg['completed_tasks']
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
    return {
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'in_progress_tasks': agg['in_progress_tasks'],
        'overdue_tasks': agg['overdue_tasks'],
        'completion_rate': round(completion_rate, 1),
    }


def calculate_avg_score(
    student_ids: Optional[List[int]] = None,
) -> Optional[float]:
    if student_ids is not None and not student_ids:
        return None
    qs = Submission.objects.filter(
        status__in=['SUBMITTED', 'GRADED'],
        task_quiz__allow_retry=False,
        task_assignment__task__is_archived=False,
    )
    if student_ids is not None:
        qs = qs.filter(user_id__in=student_ids)
    result = qs.aggregate(avg_score=Avg('obtained_score'))
    return float(result['avg_score']) if result['avg_score'] is not None else None


def get_weekly_active_users_count(user_ids: List[int]) -> int:
    if not user_ids:
        return 0
    today = timezone.localdate()
    start_date = today - timedelta(days=today.weekday())
    tz = timezone.get_current_timezone()
    start_dt = timezone.make_aware(datetime.combine(start_date, time.min), tz)
    end_dt = timezone.make_aware(datetime.combine(start_date + timedelta(days=7), time.min), tz)
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
    start_of_month = timezone.localdate().replace(day=1)
    return timezone.make_aware(
        datetime.combine(start_of_month, time.min),
        timezone.get_current_timezone(),
    )


def get_monthly_tasks_count(queryset: Optional[QuerySet] = None) -> int:
    from apps.tasks.models import Task

    base_qs = queryset if queryset is not None else Task.objects.filter(is_archived=False)
    return base_qs.filter(
        is_archived=False,
        created_at__gte=get_month_start_datetime(),
    ).count()


def get_assignments_by_students(student_ids: List[int]) -> QuerySet:
    return TaskAssignment.objects.filter(
        assignee_id__in=student_ids,
        task__is_archived=False,
    ).select_related('task')
