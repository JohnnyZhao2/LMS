from apps.authorization.decisions import AuthorizationDecision, conditional_allow, conditional_deny
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_codes,
    crud_permissions,
    scope_rules,
    perm,
)
from apps.authorization.roles import is_admin_like_role
from apps.tasks.models import Task, TaskAssignment
from apps.users.models import User


TASK_OWNER_ROLES = {'MENTOR', 'DEPT_MANAGER'}
TASK_SCOPE_SUMMARY = '学员范围'
TASK_MANAGER_CODES = (*crud_codes('task'), 'task.assign', 'task.analytics.view')
TASK_ADMIN_CODES = (*crud_codes('task'), 'task.assign')


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
        if owns_task_in_current_role or has_allow_override or resource.assignments.filter(assignee=engine.user).exists():
            return conditional_allow(permission_code, constraint='task_visibility')
        return conditional_deny(
            permission_code,
            message=error_message or '无权访问此任务',
            reason='resource_constraint',
            constraint='task_visibility',
        )

    if permission_code in {'task.update', 'task.delete'}:
        if owns_task_in_current_role or has_allow_override:
            return conditional_allow(permission_code, constraint='task_owner')
        return conditional_deny(
            permission_code,
            message=error_message or '无权操作此任务',
            reason='resource_constraint',
            constraint='task_owner',
        )

    return base_decision


def _filter_task_queryset(engine, *, queryset, context=None):
    current_role = engine.get_current_role()
    if is_admin_like_role(current_role):
        return queryset
    if current_role in TASK_OWNER_ROLES:
        return queryset.filter(created_by=engine.user, created_role=current_role)
    assigned_task_ids = TaskAssignment.objects.filter(assignee=engine.user).values_list('task_id', flat=True)
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
            *crud_permissions('task', '任务', descriptions={'update': '编辑任务和预览任务'}),
            perm(
                code='task.assign',
                name='分配任务',
                description='为任务分配学员',
                scope_group_key='task_student_scope',
                implies=('task.view',),
            ),
            perm(
                code='task.analytics.view',
                name='查看任务分析',
                description='查看任务进度、执行情况和分析统计',
                scope_group_key='task_student_scope',
                implies=('task.view',),
            ),
        ),
        role_defaults={
            'STUDENT': ('task.view',),
            'MENTOR': TASK_MANAGER_CODES,
            'DEPT_MANAGER': TASK_MANAGER_CODES,
            'ADMIN': TASK_ADMIN_CODES,
        },
        scope_rules=(
            *scope_rules('task.assign', MENTOR='MENTEES', DEPT_MANAGER='DEPARTMENT', ADMIN='ALL'),
            *scope_rules('task.analytics.view', MENTOR='MENTEES', DEPT_MANAGER='DEPARTMENT', ADMIN='ALL'),
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
                    'task.view': '自己创建或已分配',
                    'task.update': '仅自己创建',
                    'task.delete': '仅自己创建',
                    'task.analytics.view': TASK_SCOPE_SUMMARY,
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
                constraint_summary='自己创建或已分配',
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
