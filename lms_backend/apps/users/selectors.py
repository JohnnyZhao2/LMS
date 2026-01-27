"""
User selectors for LMS.
Provides optimized query functions for user-related data retrieval.
"""
from typing import Optional
from django.db.models import Q, QuerySet

from .models import User, Role, Department


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
        Filtered QuerySet of users
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
    return qs


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
