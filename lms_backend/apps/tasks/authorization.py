from apps.authorization.engine import AuthorizationDecision
from apps.authorization.owner_scope import is_owner_in_scope
from apps.authorization.roles import get_managed_user_queryset, learning_member_queryset
from apps.tasks.models import Task


def authorize_task_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Task):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if permission_code in {
        'tasks.view_task_analytics',
        'tasks.view_grading',
        'tasks.score_grading',
    }:
        read_decision = authorize_task_resource(
            engine,
            'tasks.view_task',
            resource=resource,
            context=context,
            error_message='无权访问此任务',
        )
        if not read_decision.allowed:
            return AuthorizationDecision(False, message=error_message or '无权访问此任务')
        return AuthorizationDecision(True)

    if permission_code == 'tasks.view_task':
        if is_owner_in_scope(engine, resource.created_by_id):
            return AuthorizationDecision(True)
        return AuthorizationDecision(False, message=error_message or '无权访问此任务')

    if permission_code in {'tasks.change_task', 'tasks.delete_task'}:
        if is_owner_in_scope(engine, resource.created_by_id):
            return AuthorizationDecision(True)
        return AuthorizationDecision(False, message=error_message or '无权操作此任务')

    return base_decision


def filter_scoped_learning_members(engine, *, queryset, context=None):
    """可分配 / 分析等：当前用户组织关系内的学习成员。"""
    return get_managed_user_queryset(engine.user, learning_member_queryset())
