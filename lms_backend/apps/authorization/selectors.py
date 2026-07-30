"""Authorization selectors."""

from typing import Iterable, List, Optional

from django.db.models import Q

from .constants import (
    CONFIG_PERMISSION_MODULE,
    REGISTERED_PERMISSION_CODES,
    SYSTEM_MANAGED_PERMISSION_CODES,
)
from .models import Permission, UserPermissionOverride


def list_permissions(
    module: Optional[str] = None,
    catalog_view: Optional[str] = None,
) -> List[Permission]:
    queryset = Permission.objects.filter(
        is_active=True,
        code__in=REGISTERED_PERMISSION_CODES,
    )
    if module:
        queryset = queryset.filter(module=module)
    if catalog_view == 'user_authorization':
        queryset = queryset.exclude(module=CONFIG_PERMISSION_MODULE)
    queryset = queryset.exclude(code__in=SYSTEM_MANAGED_PERMISSION_CODES)
    return list(queryset.order_by('module', 'code'))


def list_active_user_overrides(
    *,
    user_id: int,
    current_role: Optional[str],
    permission_code: Optional[str] = None,
) -> List[UserPermissionOverride]:
    if current_role in {'STUDENT', 'SUPER_ADMIN'}:
        return []

    queryset = UserPermissionOverride.objects.select_related('permission', 'user').filter(
        user_id=user_id,
    ).exclude(
        applies_to_role='STUDENT',
    )

    if current_role:
        queryset = queryset.filter(
            Q(applies_to_role__isnull=True) | Q(applies_to_role='') | Q(applies_to_role=current_role)
        )

    if permission_code:
        queryset = queryset.filter(permission__code=permission_code)

    return list(queryset.order_by('-created_at', '-id'))


def get_permissions_by_codes(permission_codes: Iterable[str]) -> List[Permission]:
    codes = [code for code in permission_codes if code]
    if not codes:
        return []
    registered_codes = [code for code in codes if code in REGISTERED_PERMISSION_CODES]
    if not registered_codes:
        return []
    return list(Permission.objects.filter(
        code__in=registered_codes,
        is_active=True,
    ))
