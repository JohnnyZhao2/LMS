from datetime import datetime, time
from typing import Any

from django.db.models import Count, Max, Q, QuerySet
from django.utils import timezone

from .models import ActivityLog

LOG_SEARCH_FIELDS = (
    'actor__username',
    'actor__employee_id',
    'summary',
    'description',
    'target_title',
)


def get_activity_log_queryset(log_type: str) -> QuerySet:
    return (
        ActivityLog.objects.filter(category=log_type)
        .select_related('actor', 'actor__department')
    )


def apply_activity_log_filters(queryset: QuerySet, filters: dict[str, Any]) -> QuerySet:
    member_ids = filters.get('member_ids') or []
    if member_ids:
        queryset = queryset.filter(actor_id__in=member_ids)

    action = filters.get('action')
    if action:
        queryset = queryset.filter(action=action)

    status = filters.get('status')
    if status:
        queryset = queryset.filter(status=status)

    date_from = filters.get('date_from')
    if date_from:
        queryset = queryset.filter(created_at__gte=_start_of_day(date_from))

    date_to = filters.get('date_to')
    if date_to:
        queryset = queryset.filter(created_at__lte=_end_of_day(date_to))

    search = (filters.get('search') or '').strip()
    if search:
        search_query = Q()
        for field in LOG_SEARCH_FIELDS:
            search_query |= Q(**{f'{field}__icontains': search})
        queryset = queryset.filter(search_query)

    return queryset


def list_activity_log_members(queryset: QuerySet) -> list[dict[str, Any]]:
    aggregated = (
        queryset
        .filter(actor_id__isnull=False)
        .values(
            'actor__id',
            'actor__employee_id',
            'actor__username',
            'actor__avatar_key',
            'actor__department__name',
            'actor__department__code',
        )
        .annotate(
            activity_count=Count('id'),
            last_activity_at=Max('created_at'),
        )
        .order_by(
            '-activity_count',
            '-last_activity_at',
            'actor__employee_id',
        )
    )

    return [
        {
            'user': {
                'id': item['actor__id'],
                'employee_id': item['actor__employee_id'],
                'username': item['actor__username'],
                'avatar_key': item['actor__avatar_key'],
                'department_name': item['actor__department__name'],
                'department_code': item['actor__department__code'],
            },
            'activity_count': item['activity_count'],
            'last_activity_at': item['last_activity_at'],
        }
        for item in aggregated
    ]


def serialize_activity_log_item(log: ActivityLog) -> dict[str, Any]:
    actor = log.actor
    return {
        'id': f'{log.category}-{log.id}',
        'category': log.category,
        'actor': None if actor is None else {
            'id': actor.id,
            'employee_id': actor.employee_id,
            'username': actor.username,
            'avatar_key': actor.avatar_key,
            'department_name': getattr(actor.department, 'name', None),
            'department_code': getattr(actor.department, 'code', None),
        },
        'action': log.action,
        'status': log.status,
        'summary': log.summary,
        'description': log.description,
        'created_at': log.created_at,
    }


def _start_of_day(target_date):
    return timezone.make_aware(datetime.combine(target_date, time.min))


def _end_of_day(target_date):
    return timezone.make_aware(datetime.combine(target_date, time.max))
