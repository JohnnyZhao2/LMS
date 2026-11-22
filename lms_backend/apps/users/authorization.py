from typing import Iterable, Optional

from django.contrib.auth.models import Group

from apps.authorization.engine import AuthorizationDecision
from apps.authorization.models import DataScope
from apps.authorization.roles import get_group_profile, is_user_in_scope
from apps.authorization.selectors import is_assignable_permission, permission_code as _perm_code
from apps.users.models import User
from core.exceptions import BusinessError, ErrorCodes

_SUPERUSER_PROTECTED_WRITE_CODES = frozenset({
    'users.change_user',
    'users.delete_user',
    'users.assign_user_role',
    'users.change_user_avatar',
})
_ROLE_DOMINANCE_PROTECTED_CODES = frozenset({
    'users.change_user',
    'users.delete_user',
})
_SELF_RESTRICTED_CODES = frozenset({
    'users.delete_user',
    'users.assign_user_role',
})


def get_uncovered_role_reason(
    engine,
    groups: Iterable[Group],
    *,
    effective_department_id: Optional[int],
    fallback_permission_code: str = 'users.assign_user_role',
) -> Optional[str]:
    """检查操作者权限与数据范围是否完全覆盖给定角色组；若未覆盖则返回拒绝原因。"""
    if engine.user.is_superuser:
        return None
    operator_perms = engine.effective_permissions

    for group in groups:
        role_perms = {
            _perm_code(perm)
            for perm in group.permissions.all()
            if is_assignable_permission(perm)
        }
        if role_perms - operator_perms:
            return '不能操作包含自身未持有权限的角色'
        profile = get_group_profile(group)
        role_scope = profile.data_scope if profile else DataScope.SELF
        role_dept_ids = {dept.id for dept in profile.departments.all()} if profile else set()
        codes_to_check = role_perms or {fallback_permission_code}

        for code in codes_to_check:
            perm_scope, perm_dept_ids = engine.get_permission_scope(code)
            if perm_scope == DataScope.ALL:
                continue
            if role_scope == DataScope.ALL:
                return '不能操作数据范围高于自身权限的角色'
            if role_scope == DataScope.CUSTOM_DEPT and not role_dept_ids.issubset(perm_dept_ids):
                return '不能操作数据范围超出自身权限的角色'
            if role_scope == DataScope.DEPT:
                if perm_scope == DataScope.SELF:
                    return '不能操作数据范围高于自身权限的角色'
                if effective_department_id not in perm_dept_ids:
                    return '不能操作数据范围超出自身权限的角色'
    return None


def validate_operator_covers_groups(
    engine,
    groups: Iterable[Group],
    *,
    effective_department_id: Optional[int],
) -> None:
    reason = get_uncovered_role_reason(
        engine,
        groups,
        effective_department_id=effective_department_id,
    )
    if reason:
        raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message=reason)


def authorize_user_resource(
    engine,
    permission_code,
    *,
    resource=None,
    context=None,
    error_message=None,
):
    """单用户写/读：先功能权限，再校验超管/高权角色保护、防自操作与数据范围。"""
    if not isinstance(resource, User):
        return None

    base = engine.base_permission_decision(permission_code, error_message=error_message)
    if not base.allowed:
        return base

    if not engine.user.is_superuser:
        if resource.is_superuser and permission_code in _SUPERUSER_PROTECTED_WRITE_CODES:
            return AuthorizationDecision(False, message=error_message or '无权操作超级管理员账号')
        if (
            resource.pk != getattr(engine.user, 'pk', None)
            and permission_code in _SUPERUSER_PROTECTED_WRITE_CODES
            and resource.groups.filter(name='ADMIN').exists()
        ):
            return AuthorizationDecision(False, message=error_message or '仅超级管理员可操作管理员账号')
        if resource.pk == getattr(engine.user, 'pk', None) and permission_code in _SELF_RESTRICTED_CODES:
            return AuthorizationDecision(False, message=error_message or '不可对当前账号执行此操作')
        if (
            resource.pk != getattr(engine.user, 'pk', None)
            and permission_code in _ROLE_DOMINANCE_PROTECTED_CODES
        ):
            active_groups = list(
                resource.groups.filter(profile__is_active=True)
                .select_related('profile')
                .prefetch_related('profile__departments', 'permissions__content_type')
            )
            uncovered_reason = get_uncovered_role_reason(
                engine,
                active_groups,
                effective_department_id=resource.department_id,
                fallback_permission_code=permission_code,
            )
            if uncovered_reason:
                return AuthorizationDecision(
                    False,
                    message=error_message or '无权操作权限或数据范围高于当前账号的用户',
                )

    scope, dept_ids = engine.get_permission_scope(permission_code)
    if is_user_in_scope(
        engine.user,
        resource,
        data_scope=scope,
        department_ids=dept_ids,
    ):
        return AuthorizationDecision(True)
    return AuthorizationDecision(False, message=error_message or '无权操作该用户')


def filter_viewable_users(engine, *, queryset, context=None):
    permission_code = (context or {}).get('_permission_code', 'users.view_user')
    return engine.filter_users_by_scope(permission_code, queryset.distinct())
