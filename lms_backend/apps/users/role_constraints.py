"""
Role assignment constraints for users.
"""
from typing import Iterable, Optional, Set

from core.exceptions import BusinessError, ErrorCodes

from .models import Role, User


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
    - DEPT_MANAGER and TEAM_MANAGER are mutually exclusive.
    - Superuser account is a dedicated role and cannot be assigned business roles.
    - TEAM_MANAGER is globally unique (active users only).
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
    if 'DEPT_MANAGER' in role_codes and 'TEAM_MANAGER' in role_codes:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='室经理与团队经理角色互斥，不能同时分配'
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
    team_manager_queryset = User.objects.filter(
        roles__code='TEAM_MANAGER',
        is_active=True,
    )
    dept_manager_queryset = User.objects.filter(
        roles__code='DEPT_MANAGER',
        is_active=True,
    )
    if exclude_user_id is not None:
        team_manager_queryset = team_manager_queryset.exclude(pk=exclude_user_id)
        dept_manager_queryset = dept_manager_queryset.exclude(pk=exclude_user_id)

    if 'TEAM_MANAGER' in role_codes:
        existing_team_manager = team_manager_queryset.first()
        if existing_team_manager:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'团队经理角色已被分配给 {existing_team_manager.employee_id}，全局只能有一个团队经理'
            )

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
