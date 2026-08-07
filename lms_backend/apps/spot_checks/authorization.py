from apps.authorization.decisions import conditional_allow, conditional_deny
from apps.authorization.registry import (
    AuthorizationSpec,
    ResourceAuthorizationHandler,
    ScopeFilterHandler,
    crud_permissions,
)
from apps.authorization.roles import is_super_admin
from apps.spot_checks.models import SpotCheck
from apps.users.models import User


def _is_spot_check_owner(engine, resource: SpotCheck) -> bool:
    """管理态：仅超管看全部，其余（含 ADMIN）只看自己发起（checker）。"""
    if is_super_admin(engine.user):
        return True
    return resource.checker_id == getattr(engine.user, 'id', None)


def _authorize_spot_check(engine, permission_code, *, resource=None, context=None, error_message=None):
    # 发起：人员范围（名下/本室学员），与「看记录」解耦
    if permission_code == 'spot_checks.add_spotcheck':
        base_decision = engine.base_permission_decision('spot_checks.add_spotcheck', error_message=error_message)
        if not base_decision.allowed:
            return base_decision

        student = (context or {}).get('student') or (context or {}).get('target_user')
        student_id = (context or {}).get('student_id') or (context or {}).get('target_user_id')
        if student is None and student_id:
            student = User.objects.filter(pk=student_id).first()

        if student is None:
            return conditional_allow('spot_checks.add_spotcheck', constraint='student_scope')
        if engine.get_scoped_learning_members('spot_checks.add_spotcheck').filter(pk=student.id).exists():
            return conditional_allow('spot_checks.add_spotcheck', constraint='student_scope')

        current_role = engine.get_current_role()
        if current_role == 'DEPT_MANAGER' and not getattr(engine.user, 'department_id', None):
            return conditional_deny(
                'spot_checks.add_spotcheck',
                message='您未分配部门，无法创建抽查记录',
                reason='missing_department',
                constraint='student_scope',
            )
        return conditional_deny(
            'spot_checks.add_spotcheck',
            message={
                'MENTOR': '只能为名下学员创建抽查记录',
                'DEPT_MANAGER': '只能为本室学员创建抽查记录',
            }.get(current_role, error_message or '无权创建抽查记录'),
            reason='scope_denied',
            constraint='student_scope',
        )

    if not isinstance(resource, SpotCheck):
        return None

    base_decision = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base_decision.allowed:
        return base_decision

    # 管理态：看/改/删 都只限自己发起；学员执行走 mine / student 分支，不在此放行
    if permission_code in {
        'spot_checks.view_spotcheck',
        'spot_checks.change_spotcheck',
        'spot_checks.delete_spotcheck',
    }:
        if _is_spot_check_owner(engine, resource):
            return conditional_allow(permission_code, constraint='spot_check_owner')
        return conditional_deny(
            permission_code,
            message=error_message or (
                '无权访问该抽查记录'
                if permission_code == 'spot_checks.view_spotcheck'
                else '只能操作自己创建的抽查记录'
            ),
            reason='resource_constraint',
            constraint='spot_check_owner',
        )

    return base_decision


def _filter_spot_check_queryset(engine, *, queryset, context=None):
    """管理列表：仅超管全量，其余只自己发起。"""
    if is_super_admin(engine.user):
        return queryset
    user_id = getattr(engine.user, 'id', None)
    if not user_id:
        return queryset.none()
    return queryset.filter(checker_id=user_id)


AUTHORIZATION_SPECS = (
    AuthorizationSpec(
        key='spot_checks.permissions',
        module='spot_check',
        permissions=crud_permissions('spot_checks', 'spotcheck'),
        resource_authorization_handlers=(
            ResourceAuthorizationHandler(
                key='spot_checks.resource_decisions',
                permission_codes=(
                    'spot_checks.view_spotcheck',
                    'spot_checks.add_spotcheck',
                    'spot_checks.change_spotcheck',
                    'spot_checks.delete_spotcheck',
                ),
                authorize=_authorize_spot_check,
            ),
        ),
        scope_filter_handlers=(
            ScopeFilterHandler(
                key='spot_checks.scope_filter.records',
                permission_code='spot_checks.view_spotcheck',
                resource_model=SpotCheck,
                filter_queryset=_filter_spot_check_queryset,
            ),
            ScopeFilterHandler(
                key='spot_checks.scope_filter.students_view',
                permission_code='spot_checks.view_spotcheck',
                resource_model=User,
                filter_queryset=lambda engine, *, queryset, context=None: (
                    engine.get_scoped_learning_members('spot_checks.view_spotcheck')
                ),
            ),
            ScopeFilterHandler(
                key='spot_checks.scope_filter.students_create',
                permission_code='spot_checks.add_spotcheck',
                resource_model=User,
                filter_queryset=lambda engine, *, queryset, context=None: (
                    engine.get_scoped_learning_members('spot_checks.add_spotcheck')
                ),
            ),
        ),
    ),
)
