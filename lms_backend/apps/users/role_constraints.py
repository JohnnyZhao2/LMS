"""
Role assignment constraints for users.
"""
from typing import Iterable, Optional, Set

from core.exceptions import BusinessError, ErrorCodes

from .models import User


NON_STUDENT_ROLE_CODES = {'MENTOR', 'DEPT_MANAGER', 'ADMIN'}


def validate_role_assignment_constraints(
    *,
    role_codes: Iterable[str],
    department_id: Optional[int],
    is_superuser: bool,
    exclude_user_id: Optional[int] = None,
    validate_dedicated_roles: bool = True,
) -> None:
    """
    Validate role assignment constraints.

    Rules:
    - Non-STUDENT business roles are single-select (at most one).
    - Superuser account is a dedicated role and cannot be assigned business roles.
    - DEPT_MANAGER is unique per department (active users only).
    """
    normalized_codes = _normalize_role_codes(role_codes)
    if validate_dedicated_roles:
        _validate_dedicated_role_composition(
            role_codes=normalized_codes,
            is_superuser=is_superuser,
        )

    _validate_exclusive_role_uniqueness(
        role_codes=normalized_codes,
        department_id=department_id,
        exclude_user_id=exclude_user_id,
    )


def _normalize_role_codes(role_codes: Iterable[str]) -> Set[str]:
    return {code for code in role_codes if code}


def _validate_dedicated_role_composition(*, role_codes: Set[str], is_superuser: bool) -> None:
    non_student_codes = NON_STUDENT_ROLE_CODES.intersection(role_codes)
    if len(non_student_codes) > 1:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='学员以外系统角色最多只能选择一个'
        )

    if is_superuser and role_codes:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='超管账号为专有角色，不允许分配业务角色'
        )


def _validate_exclusive_role_uniqueness(
    *,
    role_codes: Set[str],
    department_id: Optional[int],
    exclude_user_id: Optional[int],
) -> None:
    dept_manager_queryset = User.objects.filter(
        groups__name='DEPT_MANAGER',
        is_active=True,
    )
    if exclude_user_id is not None:
        dept_manager_queryset = dept_manager_queryset.exclude(pk=exclude_user_id)

    if 'DEPT_MANAGER' in role_codes:
        if not department_id:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='用户未分配部门，无法设置为室经理'
            )

        existing_dept_manager = dept_manager_queryset.filter(
            department_id=department_id
        ).first()
        if existing_dept_manager:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=(
                    f'部门 {existing_dept_manager.department.name} 已有室经理 '
                    f'{existing_dept_manager.employee_id}，每个部门只能有一个室经理'
                )
            )
