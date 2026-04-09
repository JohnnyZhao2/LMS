"""Role helpers shared by authorization and user modules."""

from typing import Optional


SUPER_ADMIN_ROLE = 'SUPER_ADMIN'
SUPER_ADMIN_ROLE_NAME = '超管'
ADMIN_LIKE_ROLES = {'ADMIN', SUPER_ADMIN_ROLE}
NON_STUDENT_ROLES = ['ADMIN', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER']
LEARNING_POOL_EXCLUDED_ROLE_CODES = ['DEPT_MANAGER', 'TEAM_MANAGER']


def is_super_admin(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_superuser', False)
    )


def is_admin_like_role(role_code: Optional[str]) -> bool:
    return role_code in ADMIN_LIKE_ROLES


def get_current_role(user, request):
    if not user or not user.is_authenticated:
        return None

    if is_super_admin(user):
        return SUPER_ADMIN_ROLE

    if hasattr(user, 'current_role') and user.current_role:
        return user.current_role

    role_codes = set(user.role_codes) if hasattr(user, 'role_codes') else set()
    if 'ADMIN' in role_codes:
        return 'ADMIN'
    if 'DEPT_MANAGER' in role_codes:
        return 'DEPT_MANAGER'
    if 'MENTOR' in role_codes:
        return 'MENTOR'
    if 'TEAM_MANAGER' in role_codes:
        return 'TEAM_MANAGER'
    return 'STUDENT'
