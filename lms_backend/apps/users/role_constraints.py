"""
Role assignment constraints for users.
"""
from typing import Iterable, Optional, Set

from django.db import transaction

from apps.authorization.roles import AUTH_ROLE_CODES, DEPT_ROLE, GLOBAL_ROLE, MENTOR_ROLE
from core.exceptions import BusinessError, ErrorCodes


AUTH_ROLE_PRIORITY = (GLOBAL_ROLE, DEPT_ROLE, MENTOR_ROLE)


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


@transaction.atomic
def repair_conflicting_auth_roles() -> int:
    """将同时拥有多个授权角色的用户收敛为优先级最高的一个。返回修复用户数。"""
    from apps.users.models import User, UserRole

    repaired = 0
    users = (
        User.objects.filter(roles__code__in=AUTH_ROLE_CODES)
        .distinct()
        .prefetch_related('roles')
    )
    for user in users:
        auth_codes = {role.code for role in user.roles.all() if role.code in AUTH_ROLE_CODES}
        if len(auth_codes) <= 1:
            continue
        keep_code = next(code for code in AUTH_ROLE_PRIORITY if code in auth_codes)
        UserRole.objects.filter(
            user_id=user.id,
            role__code__in=AUTH_ROLE_CODES,
        ).exclude(role__code=keep_code).delete()
        repaired += 1
    return repaired
