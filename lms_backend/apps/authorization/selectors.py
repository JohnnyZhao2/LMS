"""Authorization selectors."""

from typing import Iterable, List, Optional

from .constants import (
    CONFIG_PERMISSION_MODULE,
    REGISTERED_PERMISSION_CODES,
)
from .models import Permission


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
        queryset = queryset.filter(is_configurable=True)
    return list(queryset.order_by('module', 'code'))


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
