"""
Role-based permission classes for LMS API.
Implements permission control based on user roles and organizational relationships.
"""
from typing import Dict, Iterable, Optional, Set, Tuple

from django.db.models import Q, QuerySet
from rest_framework.permissions import BasePermission

NON_STUDENT_ROLES = ['ADMIN', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER']
LEARNING_POOL_EXCLUDED_ROLE_CODES = ['DEPT_MANAGER', 'TEAM_MANAGER']
SUPER_ADMIN_ROLE = 'SUPER_ADMIN'
SUPER_ADMIN_ROLE_NAME = '超管'
ADMIN_LIKE_ROLES = {'ADMIN', SUPER_ADMIN_ROLE}
SCOPE_ALL = 'ALL'
SCOPE_SELF = 'SELF'
SCOPE_MENTEES = 'MENTEES'
SCOPE_DEPARTMENT = 'DEPARTMENT'
SCOPE_EXPLICIT_USERS = 'EXPLICIT_USERS'
EFFECT_ALLOW = 'ALLOW'
EFFECT_DENY = 'DENY'


def is_super_admin(user) -> bool:
    return bool(
        user
        and getattr(user, 'is_authenticated', False)
        and getattr(user, 'is_superuser', False)
    )


def is_admin_like_role(role_code: Optional[str]) -> bool:
    return role_code in ADMIN_LIKE_ROLES


def get_current_role(user, request):
    """
    Get the current active role of a user.
    Args:
        user: The user object
        request: The HTTP request object
    Returns:
        Role code string or None
    """
    if not user or not user.is_authenticated:
        return None

    if is_super_admin(user):
        return SUPER_ADMIN_ROLE

    # Priority 1: Use current_role attribute set by authentication (token claim)
    if hasattr(user, 'current_role') and user.current_role:
        return user.current_role

    # Priority 2: Derive from role codes
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


class IsAdminOrMentorOrDeptManager(BasePermission):
    """
    Permission class for admin, mentor, or department manager users.
    Used for resource creation and management endpoints.
    """
    message = '只有管理员、导师或室经理可以执行此操作'
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        current_role = get_current_role(request.user, request)
        return is_admin_like_role(current_role) or current_role in ['MENTOR', 'DEPT_MANAGER']


def _pure_student_queryset() -> QuerySet:
    """
    纯学员池：
    - active + STUDENT
    - 排除 ADMIN/MENTOR/DEPT_MANAGER/TEAM_MANAGER
    """
    from apps.users.models import User

    non_student_user_ids = User.objects.filter(
        roles__code__in=NON_STUDENT_ROLES
    ).values_list('id', flat=True)

    return User.objects.filter(
        is_active=True,
        is_superuser=False,
        roles__code='STUDENT',
    ).exclude(
        id__in=non_student_user_ids,
    ).distinct()


def _learning_member_queryset() -> QuerySet:
    """
    学习成员池：
    - active + STUDENT
    - 排除 superuser / 室经理 / 团队经理
    - 可包含导师（导师仍保留 STUDENT 时）
    """
    from apps.users.models import User

    excluded_ids = User.objects.filter(
        Q(is_superuser=True) | Q(roles__code__in=LEARNING_POOL_EXCLUDED_ROLE_CODES)
    ).values_list('id', flat=True)

    return User.objects.filter(
        is_active=True,
        roles__code='STUDENT',
    ).exclude(
        id__in=excluded_ids,
    ).distinct()


def _get_role_default_accessible_students(user, request) -> QuerySet:
    """
    角色默认动态范围（无用户覆盖时的口径）。
    """
    from apps.users.models import User

    current_role = get_current_role(user, request)

    if is_admin_like_role(current_role):
        return _learning_member_queryset()

    if current_role == 'TEAM_MANAGER':
        return _learning_member_queryset()

    if current_role == 'MENTOR':
        return _learning_member_queryset().filter(mentor=user)

    if current_role == 'DEPT_MANAGER':
        if user.department_id:
            return _learning_member_queryset().filter(
                department_id=user.department_id,
            ).exclude(
                pk=user.pk,
            ).distinct()
        return User.objects.none()

    return User.objects.none()


def _resolve_scope_student_ids(
    *,
    user,
    current_role: Optional[str],
    scope_type: str,
    scope_user_ids: Iterable[int],
) -> Set[int]:
    """
    将 scope 解析为可访问学员 ID 集合（用于 ALLOW/DENY 计算）。
    """
    ids = tuple(sorted({int(user_id) for user_id in scope_user_ids}))

    if scope_type == SCOPE_ALL:
        queryset = _learning_member_queryset()
        return set(queryset.values_list('id', flat=True))

    if scope_type == SCOPE_SELF:
        return set(
            _learning_member_queryset().filter(pk=user.pk).values_list('id', flat=True)
        )

    if scope_type == SCOPE_MENTEES:
        return set(
            _learning_member_queryset().filter(mentor=user).values_list('id', flat=True)
        )

    if scope_type == SCOPE_DEPARTMENT:
        if not user.department_id:
            return set()
        return set(
            _learning_member_queryset().filter(
                department_id=user.department_id,
            ).exclude(
                pk=user.pk,
            ).values_list('id', flat=True)
        )

    if scope_type == SCOPE_EXPLICIT_USERS:
        if not ids:
            return set()
        return set(
            _learning_member_queryset().filter(id__in=ids).values_list('id', flat=True)
        )

    return set()


# Utility functions for data scope filtering
def get_accessible_students_for_permission(user, request, permission_code: str) -> QuerySet:
    """
    基于“角色默认动态范围 + 用户覆盖规则(ALLOW/DENY)”计算学员范围。
    """
    from apps.authorization.selectors import list_active_user_overrides
    from apps.users.models import User

    if not user or not user.is_authenticated:
        return User.objects.none()
    if is_super_admin(user):
        return _learning_member_queryset()

    current_role = get_current_role(user, request)
    if not current_role:
        return User.objects.none()

    default_queryset = _get_role_default_accessible_students(user, request)
    overrides = list_active_user_overrides(
        user_id=user.id,
        current_role=current_role,
        permission_code=permission_code,
    )
    if not overrides:
        return default_queryset

    allow_ids = set(default_queryset.values_list('id', flat=True))
    deny_ids: Set[int] = set()
    scope_cache: Dict[Tuple[str, Tuple[int, ...]], Set[int]] = {}

    for override in overrides:
        normalized_scope_user_ids = tuple(
            sorted({int(user_id) for user_id in (override.scope_user_ids or [])})
        )
        cache_key = (override.scope_type, normalized_scope_user_ids)
        if cache_key not in scope_cache:
            scope_cache[cache_key] = _resolve_scope_student_ids(
                user=user,
                current_role=current_role,
                scope_type=override.scope_type,
                scope_user_ids=normalized_scope_user_ids,
            )

        scope_ids = scope_cache[cache_key]
        if override.effect == EFFECT_DENY:
            deny_ids.update(scope_ids)
        elif override.effect == EFFECT_ALLOW:
            allow_ids.update(scope_ids)

    final_ids = allow_ids - deny_ids
    if not final_ids:
        return User.objects.none()

    return _learning_member_queryset().filter(id__in=final_ids).distinct()


def get_accessible_students(user, request, permission_code: Optional[str] = None) -> QuerySet:
    """
    获取可访问学员集合：
    - 未传 permission_code：返回角色默认动态范围
    - 传入 permission_code：返回默认范围 + 用户覆盖后的最终范围
    """
    if permission_code:
        return get_accessible_students_for_permission(user, request, permission_code)
    return _get_role_default_accessible_students(user, request)


def get_accessible_student_ids(user, request, permission_code: Optional[str] = None):
    """
    Get set of student IDs accessible to the given user.
    This is a convenience function for validation purposes.
    Args:
        user: The requesting user
        request: The HTTP request object
    Returns:
        Set of user IDs that the user can access
    Properties: 37, 38, 39
    """
    return set(
        get_accessible_students(user, request, permission_code=permission_code).values_list('id', flat=True)
    )
