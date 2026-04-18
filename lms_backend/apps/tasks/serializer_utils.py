from rest_framework import serializers

from apps.authorization.engine import authorize, scope_filter
from apps.users.models import User


DEFAULT_TASK_ACTIONS = {
    'view': False,
    'update': False,
    'delete': False,
    'analytics': False,
}


def get_task_actions(request, obj) -> dict[str, bool]:
    if request is None:
        return dict(DEFAULT_TASK_ACTIONS)
    return {
        'view': authorize('task.view', request, resource=obj).allowed,
        'update': authorize('task.update', request, resource=obj).allowed,
        'delete': authorize('task.delete', request, resource=obj).allowed,
        'analytics': authorize('task.analytics.view', request, resource=obj).allowed,
    }


def validate_assignee_scope(assignee_ids: list[int], request) -> None:
    accessible_ids = set(
        scope_filter('task.assign', request, resource_model=User).values_list('id', flat=True)
    )
    invalid_ids = sorted(set(assignee_ids) - accessible_ids)
    if invalid_ids:
        raise serializers.ValidationError({'assignee_ids': f'以下学员不在当前可分配范围: {invalid_ids}'})
