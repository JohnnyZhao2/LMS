from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_owned_queryset, is_owned_by_user
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_permissions,
    perm,
)
from apps.tasks.models import Task
from apps.users.models import User


TASK_OWNER_CODES = (
    'task.view',
    'task.update',
    'task.delete',
)
TASK_ANALYTICS_CODES = ('task.analytics.view',)
OWNER_SUMMARY = '仅自己创建'
MEMBER_SUMMARY = '按当前角色人员范围'


def _authorize_task(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Task):
        return None
    base = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base.allowed:
        return base
    if is_owned_by_user(resource, engine.user):
        return conditional_allow(permission_code, constraint='resource_owner')
    return conditional_deny(
        permission_code,
        message=error_message or '无权操作此任务',
        reason='resource_constraint',
        constraint='resource_owner',
    )


def _authorize_task_analytics(
    engine,
    permission_code,
    *,
    resource=None,
    context=None,
    error_message=None,
):
    if not isinstance(resource, Task):
        return None
    base = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base.allowed:
        return base
    if resource.assignments.filter(
        assignee_id__in=engine.get_scoped_learning_members().values('id')
    ).exists():
        return conditional_allow(permission_code, constraint='member_scope')
    return conditional_deny(
        permission_code,
        message=error_message or '该任务没有当前管理范围内的学员',
        reason='scope_denied',
        constraint='member_scope',
    )


def _filter_members(engine, *, queryset, context=None):
    return queryset.filter(
        id__in=engine.get_scoped_learning_members().values('id'),
    )


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='tasks.permissions',
        module='task',
        permissions=(
            *crud_permissions(
                'task',
                '任务',
                descriptions={'update': '编辑任务和预览任务'},
            ),
            perm('task.assign', '分配任务', '为任务分配执行人'),
            perm('task.analytics.view', '查看任务分析', '查看任务进度、执行情况和分析统计'),
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='tasks.resource_owner',
                permission_codes=TASK_OWNER_CODES,
                authorize=_authorize_task,
                constraint_summaries={code: OWNER_SUMMARY for code in TASK_OWNER_CODES},
            ),
            ResourceAuthorizationHandler(
                key='tasks.analytics.member_scope',
                permission_codes=TASK_ANALYTICS_CODES,
                authorize=_authorize_task_analytics,
                constraint_summaries={
                    code: MEMBER_SUMMARY for code in TASK_ANALYTICS_CODES
                },
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='tasks.view.owner',
                permission_code='task.view',
                resource_model=Task,
                filter_queryset=lambda engine, *, queryset, context=None: filter_owned_queryset(
                    queryset, engine.user
                ),
                constraint_summary=OWNER_SUMMARY,
            ),
            ScopeFilterHandler(
                key='tasks.assign.members',
                permission_code='task.assign',
                resource_model=User,
                filter_queryset=_filter_members,
                constraint_summary=MEMBER_SUMMARY,
            ),
            ScopeFilterHandler(
                key='tasks.analytics.members',
                permission_code='task.analytics.view',
                resource_model=User,
                filter_queryset=_filter_members,
                constraint_summary=MEMBER_SUMMARY,
            ),
        ),
    ),
)
