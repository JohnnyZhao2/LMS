"""Django auth.Permission 查询 helpers。

权限实体以 auth.Permission 为准；本模块只定义「授权 UI / 角色配置」可暴露的业务子集，
过滤掉子表、快照、选项等实现噪音。
"""

from typing import Iterable

from django.contrib.auth.models import Permission
from django.db.models import Q

from .registry import ASSIGNABLE_PERMISSION_CODES, permission_implies

# 列表排序：view → add → change → delete → 自定义
_ACTION_RANK = (
    ('view_', 0),
    ('add_', 1),
    ('change_', 2),
    ('delete_', 3),
)


def permission_code(item: Permission) -> str:
    return f'{item.content_type.app_label}.{item.codename}'


def is_assignable_permission(item: Permission) -> bool:
    return permission_code(item) in ASSIGNABLE_PERMISSION_CODES


def get_permissions_by_codes(permission_codes: Iterable[str]) -> list[Permission]:
    """code → Permission；保持输入顺序，跳过不存在的 code。"""
    codes = list(dict.fromkeys(code for code in permission_codes if code and '.' in code))
    if not codes:
        return []

    query = Q()
    for code in codes:
        app_label, codename = code.split('.', 1)
        query |= Q(content_type__app_label=app_label, codename=codename)

    found = {
        permission_code(item): item
        for item in Permission.objects.select_related('content_type').filter(query)
    }
    return [found[code] for code in codes if code in found]


def get_assignable_permissions_by_codes(permission_codes: Iterable[str]) -> list[Permission]:
    """仅返回可配置业务权限。"""
    return [item for item in get_permissions_by_codes(permission_codes) if is_assignable_permission(item)]


def _permission_sort_key(code: str) -> tuple:
    app, _, codename = code.partition('.')
    rank = 10
    for prefix, value in _ACTION_RANK:
        if codename.startswith(prefix):
            rank = value
            break
    return (app, rank, codename)


def list_permissions() -> list[dict]:
    """可配置业务权限目录（module = app_label）。"""
    items = get_permissions_by_codes(ASSIGNABLE_PERMISSION_CODES)
    items.sort(key=lambda item: _permission_sort_key(permission_code(item)))

    return [
        {
            'code': permission_code(item),
            'name': item.name,
            'module': item.content_type.app_label,
            'implies': permission_implies(permission_code(item)),
        }
        for item in items
    ]
