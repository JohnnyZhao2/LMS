"""
Role assignment constraints for users.
"""
from typing import Iterable, Optional, Set

from apps.authorization.roles import AUTH_ROLE_CODES
from core.exceptions import BusinessError, ErrorCodes


def validate_role_assignment_constraints(
    *,
    role_codes: Iterable[str],
    department_id: Optional[int],
    is_superuser: bool,
    exclude_user_id: Optional[int] = None,
    validate_dedicated_roles: bool = True,
) -> None:
    """
    校验角色分配约束。

    规则:
    - 授权角色（MENTOR/DEPT/GLOBAL）互斥，最多一个。
    - 超管账号为专有身份，不能分配业务角色。
    """
    normalized_codes = _normalize_role_codes(role_codes)
    if validate_dedicated_roles:
        _validate_dedicated_role_composition(
            role_codes=normalized_codes,
            is_superuser=is_superuser,
        )


def _normalize_role_codes(role_codes: Iterable[str]) -> Set[str]:
    return {code for code in role_codes if code}


def _validate_dedicated_role_composition(*, role_codes: Set[str], is_superuser: bool) -> None:
    auth_role_codes = AUTH_ROLE_CODES.intersection(role_codes)
    if len(auth_role_codes) > 1:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='授权角色最多只能选择一个',
        )

    if is_superuser and role_codes:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='超管账号为专有角色，不允许分配业务角色',
        )
