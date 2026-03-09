"""
Role-based permission classes for LMS API.
Implements permission control based on user roles and organizational relationships.
"""
from django.db.models import Q
from rest_framework.permissions import BasePermission


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
        return get_current_role(request.user, request) in ['ADMIN', 'MENTOR', 'DEPT_MANAGER']


# Utility functions for data scope filtering
def get_accessible_students(user, request):
    """
    Get queryset of students accessible to the given user based on their role.
    Args:
        user: The requesting user
        request: The HTTP request object
    Returns:
        QuerySet of User objects that the user can access (only users with STUDENT role)
    Properties: 37, 38, 39
    Note:
    - 管理员默认仅统计纯学员
    - 室经理统计本部门学员（包含导师，排除超级管理员、室经理和团队经理）
    - 团队经理统计团队学习成员池（具备 STUDENT，排除超级管理员、室经理和团队经理）
    """
    from apps.users.models import User
    current_role = get_current_role(user, request)

    # 非学员角色：这些角色的用户不参与默认学员统计/任务分配
    NON_STUDENT_ROLES = ['ADMIN', 'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER']

    # 先收集非学员用户 ID，再从 STUDENT 池中排除，避免 M2M join 导致的误包含
    non_student_user_ids = User.objects.filter(
        roles__code__in=NON_STUDENT_ROLES
    ).values_list('id', flat=True)

    # 基础查询：只返回纯学员（active + STUDENT 且不带任何非学员角色）
    base_qs = User.objects.filter(
        is_active=True,
        roles__code='STUDENT'
    ).exclude(
        id__in=non_student_user_ids
    ).distinct()

    # Admin can access all students (Property 39)
    if current_role == 'ADMIN':
        return base_qs
    # Team manager can access team learning member pool (read-only, Property 41)
    # 口径说明：
    # - 团队经理看板按"学习成员池"统计：active + STUDENT
    # - 排除：超级管理员(is_superuser=1)、室经理(DEPT_MANAGER)、团队经理(TEAM_MANAGER)
    # - 包含：导师（导师同时拥有学员角色）
    if current_role == 'TEAM_MANAGER':
        excluded_ids = User.objects.filter(
            Q(is_superuser=True) | Q(roles__code='DEPT_MANAGER') | Q(roles__code='TEAM_MANAGER')
        ).values_list('id', flat=True)
        return User.objects.filter(
            is_active=True,
            roles__code='STUDENT'
        ).exclude(
            id__in=excluded_ids
        ).distinct()
    # Mentor can only access their mentees (Property 37)
    if current_role == 'MENTOR':
        return base_qs.filter(mentor=user)
    # Department manager can only access department members (Property 38)
    # 口径说明：
    # - 室经理看本部门学员：active + STUDENT + 同部门
    # - 排除：超级管理员、室经理、团队经理、自己
    # - 包含：导师（导师同时拥有学员角色）
    if current_role == 'DEPT_MANAGER':
        if user.department_id:
            excluded_ids = User.objects.filter(
                Q(is_superuser=True) | Q(roles__code='DEPT_MANAGER') | Q(roles__code='TEAM_MANAGER')
            ).values_list('id', flat=True)
            return User.objects.filter(
                is_active=True,
                roles__code='STUDENT',
                department_id=user.department_id,
            ).exclude(
                id__in=excluded_ids
            ).exclude(pk=user.pk).distinct()
        return User.objects.none()
    # Default: no access
    return User.objects.none()
def get_accessible_student_ids(user, request):
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
    return set(get_accessible_students(user, request).values_list('id', flat=True))
