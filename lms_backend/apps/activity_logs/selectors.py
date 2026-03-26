from datetime import datetime, time
from typing import Any

from django.db.models import Count, Max, Q, QuerySet
from django.utils import timezone

from .models import ContentLog, OperationLog, UserLog


LOG_TYPE_CONFIG = {
    'user': {
        'model': UserLog,
        'actor_field': 'user',
        'select_related': ('user',),
        'search_fields': ('user__username', 'user__employee_id', 'description'),
    },
    'content': {
        'model': ContentLog,
        'actor_field': 'operator',
        'select_related': ('operator',),
        'search_fields': ('operator__username', 'operator__employee_id', 'content_title', 'description'),
    },
    'operation': {
        'model': OperationLog,
        'actor_field': 'operator',
        'select_related': ('operator',),
        'search_fields': ('operator__username', 'operator__employee_id', 'action', 'description'),
    },
}


def get_activity_log_queryset(log_type: str) -> QuerySet:
    config = LOG_TYPE_CONFIG[log_type]
    return config['model'].objects.select_related(*config['select_related']).all()


def apply_activity_log_filters(queryset: QuerySet, log_type: str, filters: dict[str, Any]) -> QuerySet:
    actor_field = LOG_TYPE_CONFIG[log_type]['actor_field']

    member_ids = filters.get('member_ids') or []
    if member_ids:
        queryset = queryset.filter(**{f'{actor_field}_id__in': member_ids})

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
        for field in LOG_TYPE_CONFIG[log_type]['search_fields']:
            search_query |= Q(**{f'{field}__icontains': search})
        queryset = queryset.filter(search_query)

    return queryset


def list_activity_log_members(queryset: QuerySet, log_type: str) -> list[dict[str, Any]]:
    actor_field = LOG_TYPE_CONFIG[log_type]['actor_field']
    aggregated = queryset.values(
        f'{actor_field}__id',
        f'{actor_field}__employee_id',
        f'{actor_field}__username',
    ).annotate(
        activity_count=Count('id'),
        last_activity_at=Max('created_at'),
    ).order_by(
        '-activity_count',
        '-last_activity_at',
        f'{actor_field}__employee_id',
    )

    return [
        {
            'user': {
                'id': item[f'{actor_field}__id'],
                'employee_id': item[f'{actor_field}__employee_id'],
                'username': item[f'{actor_field}__username'],
            },
            'activity_count': item['activity_count'],
            'last_activity_at': item['last_activity_at'],
        }
        for item in aggregated
    ]


def _start_of_day(target_date):
    return timezone.make_aware(datetime.combine(target_date, time.min))


def _end_of_day(target_date):
    return timezone.make_aware(datetime.combine(target_date, time.max))
