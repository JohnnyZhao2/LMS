from apps.authorization.engine import get_engine
from apps.users.models import User
from core.exceptions import BusinessError, ErrorCodes


DEFAULT_TASK_ACTIONS = {
    'view': False,
    'update': False,
    'delete': False,
    'analytics': False,
    'grading': False,
}


def get_task_actions_payload(request, task) -> dict[str, bool]:
    if request is None:
        return dict(DEFAULT_TASK_ACTIONS)
    engine = get_engine(request)
    return {
        'view': engine.authorize('tasks.view_task', resource=task).allowed,
        'update': engine.authorize('tasks.change_task', resource=task).allowed,
        'delete': engine.authorize('tasks.delete_task', resource=task).allowed,
        'analytics': engine.authorize('tasks.view_task_analytics', resource=task).allowed,
        'grading': engine.authorize('tasks.view_grading', resource=task).allowed,
    }


def enforce_assignable_students_scope(assignee_ids: list[int], request) -> None:
    accessible_ids = set(
        get_engine(request).scope_filter('tasks.assign_task', resource_model=User).values_list('id', flat=True)
    )
    invalid_ids = sorted(set(assignee_ids) - accessible_ids)
    if invalid_ids:
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=f'以下人员不在当前可分配范围: {invalid_ids}',
        )
