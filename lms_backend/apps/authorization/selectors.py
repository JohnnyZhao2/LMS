"""Django auth permission selectors."""

from typing import Iterable, Optional

from django.contrib.auth.models import Permission

from .constants import PERMISSION_CATALOG_BY_CODE, REGISTERED_PERMISSION_CODES


def _permission_by_code(permission_codes: Iterable[str]) -> dict[str, Permission]:
    requested = [code for code in permission_codes if code in REGISTERED_PERMISSION_CODES]
    if not requested:
        return {}

    app_labels = {code.split('.', 1)[0] for code in requested}
    codenames = {code.split('.', 1)[1] for code in requested}
    requested_set = set(requested)
    result = {}
    for permission in Permission.objects.select_related('content_type').filter(
        content_type__app_label__in=app_labels,
        codename__in=codenames,
    ):
        django_permission = f'{permission.content_type.app_label}.{permission.codename}'
        if django_permission in requested_set:
            result[django_permission] = permission
    return result


def list_permissions(module: Optional[str] = None) -> list[dict]:
    catalog = [
        item for item in PERMISSION_CATALOG_BY_CODE.values()
        if module is None or item['module'] == module
    ]
    permission_by_code = _permission_by_code(item['code'] for item in catalog)
    return [
        {
            **item,
            'name': permission_by_code[item['code']].name,
            'is_active': True,
        }
        for item in catalog
        if item['code'] in permission_by_code
    ]


def get_permissions_by_codes(permission_codes: Iterable[str]) -> list[Permission]:
    codes = list(dict.fromkeys(code for code in permission_codes if code))
    permission_by_code = _permission_by_code(codes)
    return [permission_by_code[code] for code in codes if code in permission_by_code]
