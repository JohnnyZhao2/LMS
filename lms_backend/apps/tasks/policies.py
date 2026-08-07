from apps.authorization.engine import authorize, scope_filter
from apps.users.models import User
from core.exceptions import BusinessError, ErrorCodes


DEFAULT_TASK_ACTIONS = {
    'view': False,
    'update': False,
    'delete': False,
    'analytics': False,
}


def get_task_actions_payload(request, task) -> dict[str, bool]:
    if request is None:
        return dict(DEFAULT_TASK_ACTIONS)
    return {
        'view': authorize('tasks.view_task', request, resource=task).allowed,
        'update': authorize('tasks.change_task', request, resource=task).allowed,
        'delete': authorize('tasks.delete_task', request, resource=task).allowed,
        'analytics': authorize('tasks.view_task_analytics', request, resource=task).allowed,
    }


def enforce_assignable_students_scope(assignee_ids: list[int], request) -> None:
    accessible_ids = set(
        scope_filter('tasks.assign_task', request, resource_model=User).values_list('id', flat=True)
    )
    invalid_ids = sorted(set(assignee_ids) - accessible_ids)
    if invalid_ids:
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=f'以下人员不在当前可分配范围: {invalid_ids}',
        )
