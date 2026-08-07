"""Role helpers shared by authorization and user modules."""

from typing import Iterable, Optional

from django.db.models import Q, QuerySet

from apps.users.models import ROLE_LABELS, ROLE_PRIORITY_ORDER


SUPER_ADMIN_ROLE = 'SUPER_ADMIN'
SUPER_ADMIN_ROLE_NAME = '超管'
ADMIN_LIKE_ROLES = {'ADMIN', SUPER_ADMIN_ROLE}
MANAGEMENT_ROLE_CODES = frozenset({'MENTOR', 'DEPT_MANAGER', 'ADMIN'})
LEARNING_POOL_EXCLUDED_ROLE_CODES = ['DEPT_MANAGER']


def is_super_admin(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_superuser', False)
    )


def is_admin_like_role(role_code: Optional[str]) -> bool:
    return role_code in ADMIN_LIKE_ROLES


def is_management_role(role_code: Optional[str]) -> bool:
    return role_code in MANAGEMENT_ROLE_CODES


def serialize_user_roles(user) -> list[dict[str, str]]:
    if user.is_superuser:
        return [{'code': SUPER_ADMIN_ROLE, 'name': SUPER_ADMIN_ROLE_NAME}]
    return [
        {'code': group.name, 'name': ROLE_LABELS.get(group.name, group.name)}
        for group in user.groups.all()
        if group.name in ROLE_LABELS
    ]


def get_default_role(role_codes: Iterable[str]) -> str:
    normalized_codes = {role_code for role_code in role_codes if role_code}
    if SUPER_ADMIN_ROLE in normalized_codes:
        return SUPER_ADMIN_ROLE

    if 'STUDENT' in normalized_codes:
        return 'STUDENT'

    for role_code in ROLE_PRIORITY_ORDER:
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


def require_student_workspace(user) -> None:
    """学员执行态入口：仅校验当前工作台为 STUDENT。"""
    from core.exceptions import BusinessError, ErrorCodes

    if resolve_current_role(user) != 'STUDENT':
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message='仅学员工作台可执行此操作',
        )


def get_managed_user_queryset(user, role_code: Optional[str], base_queryset: QuerySet) -> QuerySet:
    """按当前管理角色计算固定人员范围。"""
    if not user or not getattr(user, 'is_authenticated', False):
        return base_queryset.none()
    if is_super_admin(user) or role_code == SUPER_ADMIN_ROLE or role_code == 'ADMIN':
        return base_queryset
    if role_code == 'MENTOR':
        return base_queryset.filter(mentor=user)
    if role_code == 'DEPT_MANAGER':
        if not getattr(user, 'department_id', None):
            return base_queryset.none()
        return base_queryset.filter(department_id=user.department_id).exclude(pk=user.id)
    return base_queryset.none()


def learning_member_queryset() -> QuerySet:
    from apps.users.models import User

    excluded_ids = User.objects.filter(
        Q(is_superuser=True) | Q(groups__name__in=LEARNING_POOL_EXCLUDED_ROLE_CODES),
    ).values_list('id', flat=True)
    return User.objects.filter(
        is_active=True,
        groups__name='STUDENT',
    ).exclude(id__in=excluded_ids).distinct()
