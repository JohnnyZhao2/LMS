from django.db.models import Q

from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.owner_scope import filter_queryset_by_owner_scope, is_owner_in_scope
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    SCOPE_KIND_DATA,
    SCOPE_KIND_TARGET,
    ScopeFilterHandler,
    crud_permissions,
    perm,
)
from apps.tasks.models import Task, TaskAssignment
from apps.users.models import User


TASK_RESOURCE_SCOPE_GROUP = 'task_resource_scope'
TASK_ASSIGNMENT_SCOPE_GROUP = 'task_assignment_scope'
TASK_RESOURCE_SCOPE_SUMMARY = '任务可见范围'
TASK_ASSIGNMENT_SCOPE_SUMMARY = '指派人员范围'
TASK_RESOURCE_SCOPE_TYPES = ('OWN', 'ALL')
TASK_ASSIGNMENT_SCOPE_TYPES = ('MENTEES', 'DEPARTMENT', 'ALL', 'EXPLICIT_USERS')
TASK_ASSIGNEE_ROLE_CODES = ('STUDENT',)


def _authorize_task_resource(engine, permission_code, *, resource=None, context=None, error_message=None):
    if not isinstance(resource, Task):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if permission_code in {'task.analytics.view', 'grading.view', 'grading.score'}:
        read_decision = _authorize_task_resource(
            engine,
            'task.view',
            resource=resource,
            context=context,
            error_message='无权访问此任务',
        )
        if not read_decision.allowed:
            return conditional_deny(
                permission_code,
                message=error_message or '无权访问此任务',
                reason=read_decision.reason,
                constraint='task_visibility',
            )
        return conditional_allow(permission_code, constraint='task_visibility')

    if permission_code == 'task.view':
        if (
            is_owner_in_scope(engine, 'task.view', resource.created_by_id)
            or (
                engine.get_current_role() == 'STUDENT'
                and resource.assignments.filter(assignee=engine.user).exists()
            )
        ):
            return conditional_allow(permission_code, constraint='task_visibility')
        return conditional_deny(
            permission_code,
            message=error_message or '无权访问此任务',
            reason='resource_constraint',
            constraint='task_visibility',
        )

    if permission_code in {'task.update', 'task.delete'}:
        if is_owner_in_scope(engine, permission_code, resource.created_by_id):
            return conditional_allow(permission_code, constraint='task_owner')
        return conditional_deny(
            permission_code,
            message=error_message or '无权操作此任务',
            reason='resource_constraint',
            constraint='task_owner',
        )

    return base_decision


def _filter_task_queryset(engine, *, queryset, resolved_scope, context=None):
    """按任务资源最终范围过滤。"""
    _ = resolved_scope, context
    scoped_owner_tasks = filter_queryset_by_owner_scope(engine, 'task.view', queryset)
    if engine.get_current_role() != 'STUDENT':
        return scoped_owner_tasks

    assigned_task_ids = TaskAssignment.objects.filter(assignee=engine.user).values_list('task_id', flat=True)
    return queryset.filter(Q(id__in=scoped_owner_tasks.values('id')) | Q(id__in=assigned_task_ids))


def _task_assignee_queryset():
    return User.objects.filter(
        is_active=True,
        roles__code__in=TASK_ASSIGNEE_ROLE_CODES,
    ).distinct()


def _filter_assignable_users(engine, *, queryset, resolved_scope, context=None):
    """按指派范围过滤可分配学员。"""
    _ = resolved_scope, context
    return engine.get_scoped_user_queryset(
        'task.assign',
        _task_assignee_queryset(),
        cache_key='task_assignees',
    )


def _filter_task_analytics_users(engine, *, queryset, resolved_scope, context=None):
    """按分析范围过滤学员。"""
    _ = resolved_scope, context
    return engine.get_scoped_user_queryset(
        'task.analytics.view',
        _task_assignee_queryset(),
        cache_key='task_assignees',
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
                kwargs_by_action={
                    'view': {
                        'scope_kind': SCOPE_KIND_DATA,
                        'scope_group_key': TASK_RESOURCE_SCOPE_GROUP,
                        'allowed_scope_types': TASK_RESOURCE_SCOPE_TYPES,
                    },
                    'update': {
                        'scope_kind': SCOPE_KIND_DATA,
                        'scope_group_key': TASK_RESOURCE_SCOPE_GROUP,
                        'allowed_scope_types': TASK_RESOURCE_SCOPE_TYPES,
                    },
                    'delete': {
                        'scope_kind': SCOPE_KIND_DATA,
                        'scope_group_key': TASK_RESOURCE_SCOPE_GROUP,
                        'allowed_scope_types': TASK_RESOURCE_SCOPE_TYPES,
                    },
                },
            ),
            perm(
                code='task.assign',
                name='分配任务',
                description='为任务分配执行人',
                scope_kind=SCOPE_KIND_TARGET,
                scope_group_key=TASK_ASSIGNMENT_SCOPE_GROUP,
                allowed_scope_types=TASK_ASSIGNMENT_SCOPE_TYPES,
                implies=('task.view',),
            ),
            perm(
                code='task.analytics.view',
                name='查看任务分析',
                description='查看任务进度、执行情况和分析统计',
                scope_kind=SCOPE_KIND_TARGET,
                scope_group_key=TASK_ASSIGNMENT_SCOPE_GROUP,
                allowed_scope_types=TASK_ASSIGNMENT_SCOPE_TYPES,
                implies=('task.view',),
            ),
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='tasks.resource_decisions',
                permission_codes=(
                    'task.view',
                    'task.update',
                    'task.delete',
                    'task.analytics.view',
                    'grading.view',
                    'grading.score',
                ),
                authorize=_authorize_task_resource,
                constraint_summaries={
                    'task.view': TASK_RESOURCE_SCOPE_SUMMARY,
                    'task.update': TASK_RESOURCE_SCOPE_SUMMARY,
                    'task.delete': TASK_RESOURCE_SCOPE_SUMMARY,
                    'task.analytics.view': TASK_ASSIGNMENT_SCOPE_SUMMARY,
                    'grading.view': '任务可见后可阅卷',
                    'grading.score': '任务可见后可评分',
                },
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='tasks.scope_filter.task_view',
                permission_code='task.view',
                resource_model=Task,
                filter_queryset=_filter_task_queryset,
                constraint_summary=TASK_RESOURCE_SCOPE_SUMMARY,
            ),
            ScopeFilterHandler(
                key='tasks.scope_filter.assignable_users',
                permission_code='task.assign',
                resource_model=User,
                filter_queryset=_filter_assignable_users,
                constraint_summary=TASK_ASSIGNMENT_SCOPE_SUMMARY,
            ),
            ScopeFilterHandler(
                key='tasks.scope_filter.analytics_users',
                permission_code='task.analytics.view',
                resource_model=User,
                filter_queryset=_filter_task_analytics_users,
                constraint_summary=TASK_ASSIGNMENT_SCOPE_SUMMARY,
            ),
        ),
    ),
)
