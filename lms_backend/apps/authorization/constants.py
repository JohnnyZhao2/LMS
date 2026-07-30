"""Authorization constants derived from business declarations."""

from .registry import (
    build_permission_catalog,
    build_permission_constraint_summaries,
    build_resource_authorization_handlers,
    build_scope_filter_handlers,
    build_system_managed_permission_codes,
    load_authorization_specs,
)


AUTHORIZATION_SPECS = load_authorization_specs()
PERMISSION_CATALOG = build_permission_catalog(AUTHORIZATION_SPECS)
PERMISSION_CATALOG_BY_CODE = {item['code']: item for item in PERMISSION_CATALOG}
REGISTERED_PERMISSION_CODES = frozenset(PERMISSION_CATALOG_BY_CODE)
SYSTEM_MANAGED_PERMISSION_CODES = frozenset(
    build_system_managed_permission_codes(AUTHORIZATION_SPECS)
)
RESOURCE_AUTHORIZATION_HANDLERS = build_resource_authorization_handlers(AUTHORIZATION_SPECS)
SCOPE_FILTER_HANDLERS = build_scope_filter_handlers(AUTHORIZATION_SPECS)
PERMISSION_CONSTRAINT_SUMMARIES = build_permission_constraint_summaries(AUTHORIZATION_SPECS)

# 显式依赖：拥有左侧权限时必须同时拥有右侧权限。
_EXPLICIT_PERMISSION_DEPENDENCIES: dict[str, frozenset[str]] = {
    'grading.view': frozenset({'task.view'}),
    'grading.score': frozenset({'grading.view'}),
    'task.assign': frozenset({'task.view'}),
    'task.analytics.view': frozenset({'task.view'}),
    'user.role.assign': frozenset({'user.view'}),
    'user.permission.view': frozenset({'user.view'}),
    'user.permission.update': frozenset({'user.permission.view'}),
}


def _build_permission_dependencies(permission_codes: frozenset[str]) -> dict[str, frozenset[str]]:
    """构建权限依赖：CRUD 写操作依赖同前缀 view，并合并显式依赖。"""
    dependencies: dict[str, set[str]] = {
        code: set(required)
        for code, required in _EXPLICIT_PERMISSION_DEPENDENCIES.items()
        if code in permission_codes
    }
    for code in permission_codes:
        prefix, _, action = code.rpartition('.')
        if action not in {'create', 'update', 'delete'} or not prefix:
            continue
        view_code = f'{prefix}.view'
        if view_code in permission_codes:
            dependencies.setdefault(code, set()).add(view_code)
    return {
        code: frozenset(required)
        for code, required in dependencies.items()
        if required
    }


PERMISSION_DEPENDENCIES = _build_permission_dependencies(REGISTERED_PERMISSION_CODES)
