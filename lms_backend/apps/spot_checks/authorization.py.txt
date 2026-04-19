"""Spot check owned permission specs."""

from apps.authorization.decisions import AuthorizationDecision
from apps.authorization.registry import (
    AuthorizationSpec,
    PermissionDefinition,
    PermissionScopeRuleDefinition,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
)
from apps.authorization.roles import is_admin_like_role
from apps.spot_checks.models import SpotCheck
from apps.users.models import User

MANAGER_DEFAULT_PERMISSIONS = (
    'spot_check.view',
    'spot_check.create',
    'spot_check.update',
    'spot_check.delete',
)

SPOT_CHECK_SCOPE_SUMMARY = '学员范围'


def _authorize_spot_check(engine, permission_code, *, resource=None, context=None, error_message=None):
    if permission_code == 'spot_check.create':
        base_decision = engine.base_permission_decision(
            'spot_check.create',
            error_message=error_message,
        )
        if not base_decision.allowed:
            return base_decision

        student = (context or {}).get('student') or (context or {}).get('target_user')
        if student is None:
            student_id = (context or {}).get('student_id') or (context or {}).get('target_user_id')
            if student_id:
                student = User.objects.filter(pk=student_id).first()

        if student is None:
            return AuthorizationDecision.allow(
                'spot_check.create',
                constraint='student_scope',
                conditional=True,
            )
        if engine.get_scoped_learning_members('spot_check.create').filter(pk=student.id).exists():
            return AuthorizationDecision.allow(
                'spot_check.create',
                constraint='student_scope',
                conditional=True,
            )

        current_role = engine.get_current_role()
        if current_role == 'DEPT_MANAGER' and not getattr(engine.user, 'department_id', None):
            return AuthorizationDecision.deny(
                'spot_check.create',
                message='您未分配部门，无法创建抽查记录',
                reason='missing_department',
                constraint='student_scope',
                conditional=True,
            )
        if current_role == 'MENTOR':
            message = '只能为名下学员创建抽查记录'
        elif current_role == 'DEPT_MANAGER':
            message = '只能为本室学员创建抽查记录'
        else:
            message = error_message or '无权创建抽查记录'
        return AuthorizationDecision.deny(
            'spot_check.create',
            message=message,
            reason='scope_denied',
            constraint='student_scope',
            conditional=True,
        )

    if not isinstance(resource, SpotCheck):
        return None

    if permission_code in {'spot_check.update', 'spot_check.delete'}:
        view_decision = _authorize_spot_check(
            engine,
            'spot_check.view',
            resource=resource,
            context=context,
            error_message='无权访问该抽查记录',
        )
        if not view_decision.allowed:
            return AuthorizationDecision.deny(
                permission_code,
                message=error_message or '无权操作此抽查记录',
                reason=view_decision.reason,
                constraint='spot_check_scope',
                conditional=True,
            )

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    if permission_code == 'spot_check.view':
        accessible_students = engine.get_scoped_learning_members('spot_check.view')
        if accessible_students.filter(pk=resource.student_id).exists():
            return AuthorizationDecision.allow(
                permission_code,
                constraint='student_scope',
                conditional=True,
            )
        return AuthorizationDecision.deny(
            permission_code,
            message=error_message or '无权访问该抽查记录',
            reason='scope_denied',
            constraint='student_scope',
            conditional=True,
        )

    if permission_code in {'spot_check.update', 'spot_check.delete'}:
        if is_admin_like_role(engine.get_current_role()) or resource.checker_id == getattr(engine.user, 'id', None):
            return AuthorizationDecision.allow(
                permission_code,
                constraint='spot_check_owner',
                conditional=True,
            )
        return AuthorizationDecision.deny(
            permission_code,
            message=error_message or '只能操作自己创建的抽查记录',
            reason='resource_constraint',
            constraint='spot_check_owner',
            conditional=True,
        )

    return base_decision


def _filter_spot_check_queryset(engine, *, queryset, context=None):
    accessible_students = engine.get_scoped_learning_members('spot_check.view')
    return queryset.filter(student_id__in=accessible_students.values('id'))


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='spot_checks.permissions',
        module='spot_check',
        permissions=(
            PermissionDefinition(
                code='spot_check.view',
                name='查看抽查',
                description='查看抽查记录列表和详情',
                scope_group_key='spot_check_student_scope',
            ),
            PermissionDefinition(
                code='spot_check.create',
                name='创建抽查',
                description='创建抽查记录',
                scope_group_key='spot_check_student_scope',
                implies=('spot_check.view',),
            ),
            PermissionDefinition(
                code='spot_check.update',
                name='更新抽查',
                description='编辑抽查记录',
            ),
            PermissionDefinition(
                code='spot_check.delete',
                name='删除抽查',
                description='删除抽查记录',
            ),
        ),
        role_defaults={
            'MENTOR': MANAGER_DEFAULT_PERMISSIONS,
            'DEPT_MANAGER': MANAGER_DEFAULT_PERMISSIONS,
        },
        scope_rules=(
            PermissionScopeRuleDefinition('spot_check.view', 'MENTOR', 'MENTEES'),
            PermissionScopeRuleDefinition('spot_check.view', 'DEPT_MANAGER', 'DEPARTMENT'),
            PermissionScopeRuleDefinition('spot_check.create', 'MENTOR', 'MENTEES'),
            PermissionScopeRuleDefinition('spot_check.create', 'DEPT_MANAGER', 'DEPARTMENT'),
        ),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='spot_checks.resource_decisions',
                permission_codes=(
                    'spot_check.view',
                    'spot_check.create',
                    'spot_check.update',
                    'spot_check.delete',
                ),
                authorize=_authorize_spot_check,
                constraint_summaries={
                    'spot_check.view': SPOT_CHECK_SCOPE_SUMMARY,
                    'spot_check.create': SPOT_CHECK_SCOPE_SUMMARY,
                    'spot_check.update': '仅自己创建且可见',
                    'spot_check.delete': '仅自己创建且可见',
                },
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='spot_checks.scope_filter.records',
                permission_code='spot_check.view',
                resource_model=SpotCheck,
                filter_queryset=_filter_spot_check_queryset,
                constraint_summary=SPOT_CHECK_SCOPE_SUMMARY,
            ),
            ScopeFilterHandler(
                key='spot_checks.scope_filter.students_view',
                permission_code='spot_check.view',
                resource_model=User,
                filter_queryset=lambda engine, *, queryset, context=None: engine.get_scoped_learning_members('spot_check.view'),
                constraint_summary=SPOT_CHECK_SCOPE_SUMMARY,
            ),
            ScopeFilterHandler(
                key='spot_checks.scope_filter.students_create',
                permission_code='spot_check.create',
                resource_model=User,
                filter_queryset=lambda engine, *, queryset, context=None: engine.get_scoped_learning_members('spot_check.create'),
                constraint_summary=SPOT_CHECK_SCOPE_SUMMARY,
            ),
        ),
    ),
)
