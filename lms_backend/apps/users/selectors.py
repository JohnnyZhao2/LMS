"""
User selectors for LMS.
Provides optimized query functions for user-related data retrieval.
"""
from typing import List, Optional

from django.db.models import Case, Exists, IntegerField, OuterRef, Q, QuerySet, Value, When

from .models import Department, Role, User, UserRole


def user_base_queryset() -> QuerySet:
    """
    Base queryset for users with common prefetches.
    Returns:
        QuerySet with select_related and prefetch_related applied
    """
    return User.objects.select_related(
        'department',
        'mentor'
    ).prefetch_related('roles')


def get_user_by_id(pk: int) -> Optional[User]:
    """
    Get a user by ID with related data.
    Args:
        pk: User primary key
    Returns:
        User instance or None
    """
    return user_base_queryset().filter(pk=pk).first()


def list_users(
    is_active: Optional[bool] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
) -> QuerySet:
    """
    List users with optional filters.
    Args:
        is_active: Filter by active status
        department_id: Filter by department
        search: Search in username or employee_id
    Returns:
        Filtered QuerySet of users, with dept_manager at top when filtering by department
    """
    qs = user_base_queryset()
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    if department_id:
        qs = qs.filter(department_id=department_id)
    if search:
        qs = qs.filter(
            Q(username__icontains=search) |
            Q(employee_id__icontains=search)
        )

    # 按部门筛选时，室经理置顶
    if department_id:
        # 使用子查询判断是否是室经理，避免 JOIN 导致重复
        dept_manager_subquery = UserRole.objects.filter(
            user_id=OuterRef('pk'),
            role__code='DEPT_MANAGER'
        )
        qs = qs.annotate(
            _dept_manager_sort=Case(
                When(Exists(dept_manager_subquery), then=Value(0)),
                default=Value(1),
                output_field=IntegerField()
            )
        ).order_by('_dept_manager_sort', 'employee_id')
    else:
        qs = qs.order_by('employee_id')

    return qs


def list_users_needing_attention(
    student_ids: List[int],
    is_active: Optional[bool] = None,
    department_id: Optional[int] = None,
    search: Optional[str] = None,
) -> QuerySet:
    """
    List users who need attention based on dashboard alert rules.
    Args:
        student_ids: Candidate student IDs within data scope
        is_active: Filter by active status
        department_id: Filter by department
        search: Search in username or employee_id
    Returns:
        Filtered QuerySet of users
    """
    if not student_ids:
        return User.objects.none()

    from apps.dashboard.selectors import get_students_needing_attention

    alerts = get_students_needing_attention(student_ids)
    alert_ids = [item['student_id'] for item in alerts]
    if not alert_ids:
        return User.objects.none()

    qs = list_users(
        is_active=is_active,
        department_id=department_id,
        search=search
    )
    return qs.filter(id__in=alert_ids)


def list_mentors() -> QuerySet:
    """
    List all active users with MENTOR role.
    Returns:
        QuerySet of mentor users
    """
    return User.objects.filter(
        roles__code='MENTOR',
        is_active=True
    ).distinct().order_by('username')


def list_departments() -> QuerySet:
    """
    List all departments.
    Returns:
        QuerySet of departments
    """
    return Department.objects.all().order_by('code')


def list_roles(exclude_student: bool = True) -> QuerySet:
    """
    List all roles.
    Args:
        exclude_student: Whether to exclude STUDENT role
    Returns:
        QuerySet of roles
    """
    qs = Role.objects.all()
    if exclude_student:
        qs = qs.exclude(code='STUDENT')
    return qs.order_by('code')
