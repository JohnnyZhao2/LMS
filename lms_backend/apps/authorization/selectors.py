"""Authorization selectors."""

from typing import Iterable, List, Optional

from .constants import REGISTERED_PERMISSION_CODES, SYSTEM_MANAGED_PERMISSION_CODES
from .models import Permission


def list_permissions(
    module: Optional[str] = None,
) -> List[Permission]:
    queryset = Permission.objects.filter(
        is_active=True,
        code__in=REGISTERED_PERMISSION_CODES,
    ).exclude(code__in=SYSTEM_MANAGED_PERMISSION_CODES)
    if module:
        queryset = queryset.filter(module=module)
    return list(queryset.order_by('module', 'code'))


def get_permissions_by_codes(permission_codes: Iterable[str]) -> List[Permission]:
    codes = set(permission_codes) & set(REGISTERED_PERMISSION_CODES)
    return list(Permission.objects.filter(code__in=codes, is_active=True))
