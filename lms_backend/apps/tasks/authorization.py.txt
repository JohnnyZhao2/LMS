"""Task owned permission specs."""

from apps.authorization.decisions import AuthorizationDecision
from apps.authorization.registry import (
    AuthorizationSpec,
    PermissionDefinition,
    PermissionScopeRuleDefinition,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
)
from apps.authorization.roles import is_admin_like_role
from apps.tasks.models import Task, TaskAssignment
from apps.users.models import User


TASK_OWNER_ROLES = {'MENTOR', 'DEPT_MANAGER'}
TASK_SCOPE_SUMMARY = '默认按学员范围生效，可通过用户授权按学员范围增删。'


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
            return AuthorizationDecision.deny(
                permission_code,
                message=error_message or '无权访问此任务',
                reason=read_decision.reason,
                constraint='task_visibility',
                conditional=True,
            )
        return AuthorizationDecision.allow(
            permission_code,
            constraint='task_visibility',
            conditional=True,
        )

    current_role = engine.get_current_role()
    if is_admin_like_role(current_role):
        return AuthorizationDecision.allow(permission_code)

    owns_task_in_current_role = (
        current_role in TASK_OWNER_ROLES
        and getattr(engine.user, 'id', None) == resource.created_by_id
        and resource.created_role == current_role
    )
    has_allow_override = engine.has_allow_override(permission_code)

    if permission_code == 'task.view':
        is_assignee = resource.assignments.filter(assignee=engine.user).exists()
        if owns_task_in_current_role or is_assignee or has_allow_override:
            return AuthorizationDecision.allow(
                permission_code,
                constraint='task_visibility',
                conditional=True,
            )
        return AuthorizationDecision.deny(
            permission_code,
            message=error_message or '无权访问此任务',
            reason='resource_constraint',
            constraint='task_visibility',
            conditional=True,
        )

    if permission_code in {'task.update', 'task.delete'}:
        if owns_task_in_current_role or has_allow_override:
            return AuthorizationDecision.allow(
                permission_code,
                constraint='task_owner',
                conditional=True,
            )
        return AuthorizationDecision.deny(
            permission_code,
            message=error_message or '无权操作此任务',
            reason='resource_constraint',
            constraint='task_owner',
            conditional=True,
        )

    return base_decision


def _filter_task_queryset(engine, *, queryset, context=None):
    current_role = engine.get_current_role()
    if is_admin_like_role(current_role):
        return queryset
    if current_role in TASK_OWNER_ROLES:
        return queryset.filter(
            created_by=engine.user,
            created_role=current_role,
        )
    assigned_task_ids = TaskAssignment.objects.filter(
        assignee=engine.user,
    ).values_list('task_id', flat=True)
    return queryset.filter(id__in=assigned_task_ids)


def _filter_assignable_students(engine, *, queryset, context=None):
    return engine.get_scoped_learning_members('task.assign')


def _filter_task_analytics_students(engine, *, queryset, context=None):
    return engine.get_scoped_learning_members('task.analytics.view')


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='tasks.permissions',
        module='task',
        permissions=(
            PermissionDefinition(
                code='task.view',
                name='查看任务',
                description='查看任务列表和任务详情',
            ),
            PermissionDefinition(
                code='task.create',
                name='创建任务',
                description='创建任务',
            ),
            PermissionDefinition(
                code='task.update',
                name='更新任务',
                description='编辑任务和预览任务',
            ),
            PermissionDefinition(
                code='task.delete',
                name='删除任务',
                description='删除任务',
            ),
            PermissionDefinition(
                code='task.assign',
                name='分配任务',
                description='为任务分配学员',
            ),
            PermissionDefinition(
                code='task.analytics.view',
                name='查看任务分析',
                description='查看任务进度、执行情况和分析统计',
            ),
        ),
        role_defaults={
            'STUDENT': ('task.view',),
            'MENTOR': (
                'task.view',
                'task.create',
                'task.update',
                'task.delete',
                'task.assign',
                'task.analytics.view',
            ),
            'DEPT_MANAGER': (
                'task.view',
                'task.create',
                'task.update',
                'task.delete',
                'task.assign',
                'task.analytics.view',
            ),
            'ADMIN': (
                'task.view',
                'task.create',
                'task.update',
                'task.delete',
                'task.assign',
            ),
        },
        scope_rules=(
            PermissionScopeRuleDefinition('task.assign', 'MENTOR', 'MENTEES'),
            PermissionScopeRuleDefinition('task.assign', 'DEPT_MANAGER', 'DEPARTMENT'),
            PermissionScopeRuleDefinition('task.assign', 'ADMIN', 'ALL'),
            PermissionScopeRuleDefinition('task.analytics.view', 'MENTOR', 'MENTEES'),
            PermissionScopeRuleDefinition('task.analytics.view', 'DEPT_MANAGER', 'DEPARTMENT'),
            PermissionScopeRuleDefinition('task.analytics.view', 'ADMIN', 'ALL'),
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
                    'task.view': '非管理员仅可查看自己创建或已分配给自己的任务。',
                    'task.update': '非管理员仅可编辑自己创建的任务。',
                    'task.delete': '非管理员仅可删除自己创建的任务。',
                    'task.analytics.view': TASK_SCOPE_SUMMARY,
                    'grading.view': '具备阅卷权限且可见该任务时才可进入阅卷。',
                    'grading.score': '具备评分权限且可见该任务时才可提交评分。',
                },
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='tasks.scope_filter.task_view',
                permission_code='task.view',
                resource_model=Task,
                filter_queryset=_filter_task_queryset,
                constraint_summary='非管理员仅可看到自己创建或已分配给自己的任务。',
            ),
            ScopeFilterHandler(
                key='tasks.scope_filter.assignable_students',
                permission_code='task.assign',
                resource_model=User,
                filter_queryset=_filter_assignable_students,
                constraint_summary=TASK_SCOPE_SUMMARY,
            ),
            ScopeFilterHandler(
                key='tasks.scope_filter.analytics_students',
                permission_code='task.analytics.view',
                resource_model=User,
                filter_queryset=_filter_task_analytics_students,
                constraint_summary=TASK_SCOPE_SUMMARY,
            ),
        ),
    ),
)
