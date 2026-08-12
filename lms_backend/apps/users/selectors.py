"""
User selectors for LMS.
Provides optimized query functions for user-related data retrieval.
"""
from typing import Optional

from django.db.models import Case, IntegerField, Q, QuerySet, Value, When

from core.exceptions import BusinessError, ErrorCodes

from .models import Department, User


def user_base_queryset() -> QuerySet:
    """
    Base queryset for users with common prefetches.
    Returns:
        QuerySet with select_related and prefetch_related applied
    """
    return User.objects.select_related(
        'department',
        'mentor'
    ).prefetch_related('groups')


def get_user_by_id(pk: int) -> Optional[User]:
    """
    Get a user by ID with related data.
    Args:
        pk: User primary key
    Returns:
        User instance or None
    """
    return user_base_queryset().filter(pk=pk).first()


def get_user_or_404(pk: int) -> User:
    user = get_user_by_id(pk)
    if not user:
        raise BusinessError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message='用户不存在',
        )
    return user


def get_user_by_employee_id(employee_id: str) -> Optional[User]:
    """
    Get a user by employee ID with related data.
    """
    return user_base_queryset().filter(employee_id=employee_id).first()


def get_valid_mentor_by_id(mentor_id: Optional[int]) -> Optional[User]:
    """可指定为导师的在职员工。不要求 MENTOR Group。"""
    if mentor_id is None:
        return None

    mentor = get_user_by_id(mentor_id)
    if mentor is None:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='导师不存在',
        )
    if mentor.is_superuser:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='不能指定超管为导师',
        )
    if not mentor.is_active:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='指定的导师已被停用',
        )
    return mentor


def list_users(
    is_active: Optional[bool] = None,
    department_id: Optional[int] = None,
    mentor_id: Optional[int] = None,
    search: Optional[str] = None,
) -> QuerySet:
    """
    List users with optional filters.
    Args:
        is_active: Filter by active status
        department_id: Filter by department
        mentor_id: Filter by mentor
        search: Search in username or employee_id
    Returns:
        Filtered QuerySet of users, with department.manager at top when filtering by department
    """
    qs = user_base_queryset()
    if is_active is not None:
        qs = qs.filter(is_active=is_active)
    if department_id:
        qs = qs.filter(department_id=department_id)
    if mentor_id:
        qs = qs.filter(mentor_id=mentor_id)
    if search:
        qs = qs.filter(
            Q(username__icontains=search) |
            Q(employee_id__icontains=search)
        )

    if department_id:
        manager_id = Department.objects.filter(pk=department_id).values_list('manager_id', flat=True).first()
        qs = qs.annotate(
            _dept_manager_sort=Case(
                When(pk=manager_id, then=Value(0)),
                default=Value(1),
                output_field=IntegerField()
            )
        ).order_by('_dept_manager_sort', 'employee_id')
    else:
        qs = qs.order_by('employee_id')

    return qs
