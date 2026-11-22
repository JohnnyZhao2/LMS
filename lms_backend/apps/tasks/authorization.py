from apps.authorization.engine import AuthorizationDecision
from apps.authorization.owner_scope import is_owner_in_scope
from apps.authorization.roles import learning_member_queryset
from apps.tasks.models import Task

_TASK_READ_FOLLOWUP_CODES = frozenset({
    'tasks.view_task_analytics',
    'tasks.view_grading',
    'tasks.score_grading',
})
_TASK_WRITE_CODES = frozenset({'tasks.change_task', 'tasks.delete_task'})
_TASK_SCOPED_CODES = _TASK_READ_FOLLOWUP_CODES | _TASK_WRITE_CODES | {'tasks.view_task'}


def authorize_task_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Task):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if permission_code in _TASK_READ_FOLLOWUP_CODES:
        read_decision = authorize_task_resource(
            engine,
            'tasks.view_task',
            resource=resource,
            context=context,
            error_message='无权访问此任务',
        )
        if not read_decision.allowed:
            return AuthorizationDecision(False, message=error_message or '无权访问此任务')

    if permission_code in _TASK_SCOPED_CODES:
        owner = resource._state.fields_cache.get('created_by')
        if is_owner_in_scope(engine, resource.created_by_id, permission_code=permission_code, owner=owner):
            return AuthorizationDecision(True)
        default_message = '无权操作此任务' if permission_code in _TASK_WRITE_CODES else '无权访问此任务'
        return AuthorizationDecision(False, message=error_message or default_message)

    return base_decision


def filter_scoped_learning_members(engine, *, queryset=None, context=None):
    """可分配 / 分析等：按对应权限数据范围过滤在职学习成员。"""
    permission_code = (context or {}).get('_permission_code', 'tasks.assign_task')
    base_qs = (
        queryset.filter(is_active=True, is_superuser=False)
        if queryset is not None
        else learning_member_queryset()
    )
    return engine.filter_users_by_scope(permission_code, base_qs)
