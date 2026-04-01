from datetime import datetime, time
from typing import Any

from django.db.models import Count, Max, Q, QuerySet
from django.db.models.functions import Coalesce
from django.utils import timezone

from .models import ContentLog, OperationLog, UserLog


LOG_TYPE_CONFIG = {
    'user': {
        'model': UserLog,
        'actor_field': 'effective_actor',
        'select_related': ('user', 'operator'),
        'search_fields': ('user__username', 'user__employee_id', 'operator__username', 'operator__employee_id', 'description'),
        'needs_annotation': True,
    },
    'content': {
        'model': ContentLog,
        'actor_field': 'operator',
        'select_related': ('operator',),
        'search_fields': ('operator__username', 'operator__employee_id', 'content_title', 'description'),
        'needs_annotation': False,
    },
    'operation': {
        'model': OperationLog,
        'actor_field': 'operator',
        'select_related': ('operator',),
        'search_fields': ('operator__username', 'operator__employee_id', 'action', 'description', 'target_title'),
        'needs_annotation': False,
    },
}


def _annotate_effective_actor(queryset: QuerySet, log_type: str) -> QuerySet:
    if LOG_TYPE_CONFIG[log_type]['needs_annotation']:
        return queryset.annotate(effective_actor_id=Coalesce('operator_id', 'user_id'))
    return queryset


def get_activity_log_queryset(log_type: str) -> QuerySet:
    config = LOG_TYPE_CONFIG[log_type]
    qs = config['model'].objects.select_related(*config['select_related']).all()
    return _annotate_effective_actor(qs, log_type)


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
    config = LOG_TYPE_CONFIG[log_type]

    if config['needs_annotation']:
        # UserLog: actor = COALESCE(operator, user)，需要用 annotation 聚合
        from apps.users.models import User
        actor_ids = (
            queryset
            .values_list('effective_actor_id', flat=True)
            .distinct()
        )
        # 按 actor_id 聚合统计
        aggregated = (
            queryset
            .values('effective_actor_id')
            .annotate(
                activity_count=Count('id'),
                last_activity_at=Max('created_at'),
            )
            .order_by('-activity_count', '-last_activity_at')
        )
        # 批量查用户信息
        users = (
            User.objects.filter(id__in=actor_ids)
            .select_related('department')
            .only('id', 'employee_id', 'username', 'avatar_key', 'department__name')
        )
        user_map = {
            u.id: u
            for u in users
        }
        return [
            {
                'user': {
                    'id': item['effective_actor_id'],
                    'employee_id': user_map[item['effective_actor_id']].employee_id,
                    'username': user_map[item['effective_actor_id']].username,
                    'avatar_key': user_map[item['effective_actor_id']].avatar_key,
                    'department_name': getattr(user_map[item['effective_actor_id']].department, 'name', None),
                    'department_code': getattr(user_map[item['effective_actor_id']].department, 'code', None),
                },
                'activity_count': item['activity_count'],
                'last_activity_at': item['last_activity_at'],
            }
            for item in aggregated
            if item['effective_actor_id'] in user_map
        ]

    actor_field = config['actor_field']
    aggregated = queryset.values(
        f'{actor_field}__id',
        f'{actor_field}__employee_id',
        f'{actor_field}__username',
        f'{actor_field}__avatar_key',
        f'{actor_field}__department__name',
        f'{actor_field}__department__code',
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
                'avatar_key': item[f'{actor_field}__avatar_key'],
                'department_name': item[f'{actor_field}__department__name'],
                'department_code': item[f'{actor_field}__department__code'],
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
