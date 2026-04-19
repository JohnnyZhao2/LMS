"""Role helpers shared by authorization and user modules."""

from typing import Iterable, Optional


SUPER_ADMIN_ROLE = 'SUPER_ADMIN'
SUPER_ADMIN_ROLE_NAME = '超管'
ADMIN_LIKE_ROLES = {'ADMIN', SUPER_ADMIN_ROLE}
LEARNING_POOL_EXCLUDED_ROLE_CODES = ['DEPT_MANAGER', 'TEAM_MANAGER']


def is_super_admin(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_superuser', False)
    )


def is_admin_like_role(role_code: Optional[str]) -> bool:
    return role_code in ADMIN_LIKE_ROLES


def serialize_user_roles(user) -> list[dict[str, str]]:
    if user.is_superuser:
        return [{'code': SUPER_ADMIN_ROLE, 'name': SUPER_ADMIN_ROLE_NAME}]
    return [{'code': role.code, 'name': role.name} for role in user.roles.all()]


def get_default_role(role_codes: Iterable[str]) -> str:
    normalized_codes = {role_code for role_code in role_codes if role_code}
    if SUPER_ADMIN_ROLE in normalized_codes:
        return SUPER_ADMIN_ROLE

    if 'STUDENT' in normalized_codes:
        return 'STUDENT'

    from apps.users.models import Role

    for role_code in Role.ROLE_PRIORITY_ORDER:
        if role_code != 'STUDENT' and role_code in normalized_codes:
            return role_code
    return 'STUDENT'


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
