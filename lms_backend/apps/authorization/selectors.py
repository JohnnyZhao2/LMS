"""Authorization selectors."""

from typing import Iterable, List, Optional

from django.db.models import Q
from django.utils import timezone

from .constants import (
    CONFIG_PERMISSION_MODULE,
    PERMISSION_SCOPE_GROUPS,
    REGISTERED_PERMISSION_CODES,
    SYSTEM_MANAGED_PERMISSION_CODES,
)
from .models import Permission, UserPermissionOverride, UserScopeGroupOverride


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
    if catalog_view in {'role_template', 'user_authorization'}:
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
        is_active=True,
        revoked_at__isnull=True,
    ).exclude(
        applies_to_role='STUDENT',
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    )

    if current_role:
        queryset = queryset.filter(
            Q(applies_to_role__isnull=True) | Q(applies_to_role='') | Q(applies_to_role=current_role)
        )

    if permission_code:
        queryset = queryset.filter(permission__code=permission_code)

    return list(queryset.order_by('-created_at', '-id'))


def list_active_scope_group_overrides(
    *,
    user_id: int,
    current_role: Optional[str],
    scope_group_key: Optional[str] = None,
) -> List[UserScopeGroupOverride]:
    if current_role in {'STUDENT', 'SUPER_ADMIN'}:
        return []

    queryset = UserScopeGroupOverride.objects.select_related('user').filter(
        user_id=user_id,
        is_active=True,
        revoked_at__isnull=True,
    ).exclude(
        applies_to_role='STUDENT',
    ).filter(
        Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
    )

    if current_role:
        queryset = queryset.filter(
            Q(applies_to_role__isnull=True) | Q(applies_to_role='') | Q(applies_to_role=current_role)
        )

    if scope_group_key:
        queryset = queryset.filter(scope_group_key=scope_group_key)
        scope_group = PERMISSION_SCOPE_GROUPS.get(scope_group_key)
        if scope_group:
            queryset = queryset.filter(scope_type__in=scope_group['available_scope_types'])

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
