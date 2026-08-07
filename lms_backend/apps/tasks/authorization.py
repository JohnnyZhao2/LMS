from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_queryset_by_owner_scope, is_owner_in_scope
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_permissions,
    perm,
)
from apps.tasks.models import Task
from apps.users.models import User


TASK_ASSIGNEE_ROLE_CODES = ('STUDENT', 'DEPT_MANAGER')


def _authorize_task_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Task):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    # 管理态：仅超管看全部，其余含 ADMIN 只本人创建；执行态走学员接口
    if permission_code in {
        'tasks.view_task',
        'tasks.view_task_analytics',
        'tasks.view_grading',
        'tasks.score_grading',
        'tasks.change_task',
        'tasks.delete_task',
    }:
        if is_owner_in_scope(engine, resource.created_by_id):
            return conditional_allow(
                permission_code,
                constraint='task_owner' if permission_code in {'tasks.change_task', 'tasks.delete_task'} else 'task_visibility',
            )
        return conditional_deny(
            permission_code,
            message=error_message or (
                '无权操作此任务' if permission_code in {'tasks.change_task', 'tasks.delete_task'} else '无权访问此任务'
            ),
            reason='resource_constraint',
            constraint='task_owner' if permission_code in {'tasks.change_task', 'tasks.delete_task'} else 'task_visibility',
        )

    return base_decision


def _filter_task_queryset(engine, *, queryset, context=None):
    return filter_queryset_by_owner_scope(engine, queryset)


def _task_assignee_queryset():
    return User.objects.filter(
        is_active=True,
        groups__name__in=TASK_ASSIGNEE_ROLE_CODES,
    ).distinct()


def _filter_assignable_users(engine, *, queryset, context=None):
    return engine.get_scoped_user_queryset('tasks.assign_task', _task_assignee_queryset())


def _filter_task_analytics_users(engine, *, queryset, context=None):
    return engine.get_scoped_user_queryset('tasks.view_task_analytics', _task_assignee_queryset())


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='tasks.permissions',
        module='task',
        permissions=(
            *crud_permissions('tasks', 'task'),
            perm(
                code='tasks.assign_task',
                implies=('tasks.view_task',),
            ),
            perm(
                code='tasks.view_task_analytics',
                implies=('tasks.view_task',),
            ),
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='tasks.resource_decisions',
                permission_codes=(
                    'tasks.view_task',
                    'tasks.change_task',
                    'tasks.delete_task',
                    'tasks.view_task_analytics',
                    'tasks.view_grading',
                    'tasks.score_grading',
                ),
                authorize=_authorize_task_resource,
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='tasks.scope_filter.task_view',
                permission_code='tasks.view_task',
                resource_model=Task,
                filter_queryset=_filter_task_queryset,
            ),
            ScopeFilterHandler(
                key='tasks.scope_filter.assignable_users',
                permission_code='tasks.assign_task',
                resource_model=User,
                filter_queryset=_filter_assignable_users,
            ),
            ScopeFilterHandler(
                key='tasks.scope_filter.analytics_users',
                permission_code='tasks.view_task_analytics',
                resource_model=User,
                filter_queryset=_filter_task_analytics_users,
            ),
        ),
    ),
)
