"""Authorization selectors."""

from typing import Iterable, List, Optional

from django.db.models import Q
from django.utils import timezone

from .constants import PERMISSION_CATALOG, SYSTEM_MANAGED_PERMISSION_CODES
from .models import Permission, PermissionScopeRule, UserPermissionOverride

REGISTERED_PERMISSION_CODES = frozenset(item['code'] for item in PERMISSION_CATALOG)


def list_permissions(module: Optional[str] = None, include_system_managed: bool = False) -> List[Permission]:
    queryset = Permission.objects.filter(
        is_active=True,
        code__in=REGISTERED_PERMISSION_CODES,
    )
    if module:
        queryset = queryset.filter(module=module)
    if not include_system_managed:
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


def list_permission_scope_types(*, permission_code: str, role_code: str) -> List[str]:
    return list(
        PermissionScopeRule.objects.filter(
            permission__code=permission_code,
            permission__is_active=True,
            role_code=role_code,
            is_active=True,
        ).order_by('scope_type').values_list('scope_type', flat=True)
    )


def list_role_scope_types(*, role_code: str) -> List[str]:
    return list(
        PermissionScopeRule.objects.filter(
            role_code=role_code,
            permission__is_active=True,
            is_active=True,
        ).order_by('scope_type').values_list('scope_type', flat=True).distinct()
    )
