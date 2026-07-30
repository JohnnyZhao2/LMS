"""Role helpers shared by authorization and user modules."""

from typing import Iterable, Optional


SUPER_ADMIN_ROLE = 'SUPER_ADMIN'
SUPER_ADMIN_ROLE_NAME = '超管'
STUDENT_ROLE = 'STUDENT'
MENTOR_ROLE = 'MENTOR'
DEPT_ROLE = 'DEPT'
GLOBAL_ROLE = 'GLOBAL'

# 授权系统业务角色：仅按作用范围区分
AUTH_ROLE_CODES = frozenset({MENTOR_ROLE, DEPT_ROLE, GLOBAL_ROLE})
ROLE_MEMBER_SCOPE = {
    MENTOR_ROLE: 'MENTEES',
    DEPT_ROLE: 'DEPARTMENT',
    GLOBAL_ROLE: 'ALL',
}


def is_super_admin(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_superuser', False)
    )


def is_auth_role(role_code: Optional[str]) -> bool:
    return role_code in AUTH_ROLE_CODES


def serialize_user_roles(user) -> list[dict[str, str]]:
    if user.is_superuser:
        return [{'code': SUPER_ADMIN_ROLE, 'name': SUPER_ADMIN_ROLE_NAME}]
    return [{'code': role.code, 'name': role.name} for role in user.roles.all()]


def get_default_role(role_codes: Iterable[str]) -> str:
    normalized_codes = {role_code for role_code in role_codes if role_code}
    if SUPER_ADMIN_ROLE in normalized_codes:
        return SUPER_ADMIN_ROLE

    if STUDENT_ROLE in normalized_codes:
        return STUDENT_ROLE

    from apps.users.models import Role

    for role_code in Role.ROLE_PRIORITY_ORDER:
        if role_code != STUDENT_ROLE and role_code in normalized_codes:
            return role_code
    return STUDENT_ROLE


def resolve_current_role(user, requested_role: Optional[str] = None) -> Optional[str]:
    if not user or not user.is_authenticated:
        return None

    if is_super_admin(user):
        return SUPER_ADMIN_ROLE

    role_codes = {role_code for role_code in getattr(user, 'role_codes', []) if role_code}
    if requested_role and requested_role in role_codes:
        return requested_role

    current_role = getattr(user, 'current_role', None)
    if current_role and current_role in role_codes:
        return current_role

    return get_default_role(role_codes)


def get_current_role(user):
    return resolve_current_role(user)


def is_student_workspace(request) -> bool:
    """当前请求是否处于学员工作台（当前角色为 STUDENT）。"""
    return resolve_current_role(getattr(request, 'user', None)) == STUDENT_ROLE


def enforce_student_workspace(request, *, error_message: Optional[str] = None) -> None:
    """学员工作台门禁：非 STUDENT 角色直接拒绝。"""
    if is_student_workspace(request):
        return
    from core.exceptions import BusinessError, ErrorCodes

    raise BusinessError(
        code=ErrorCodes.PERMISSION_DENIED,
        message=error_message or '只有学员角色可以访问',
    )


def enforce_current_roles(
    request,
    allowed_roles: Iterable[str],
    *,
    error_message: Optional[str] = None,
) -> None:
    """工作台角色门禁：当前角色不在允许集合则拒绝（不走权限点）。"""
    current_role = resolve_current_role(getattr(request, 'user', None))
    if current_role and current_role in set(allowed_roles):
        return
    from core.exceptions import BusinessError, ErrorCodes

    raise BusinessError(
        code=ErrorCodes.PERMISSION_DENIED,
        message=error_message or '当前角色无权访问',
    )
