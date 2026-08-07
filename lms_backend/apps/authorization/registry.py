"""从各业务模块收集管理态权限声明。"""

from dataclasses import dataclass
from functools import lru_cache
from importlib import import_module
from typing import Any, Callable, Iterable, Optional

from django.conf import settings
from django.utils.module_loading import import_string, module_has_submodule


@dataclass(frozen=True)
class PermissionDefinition:
    """权限码及必要依赖；名称由 Django Permission 提供。"""

    code: str
    implies: tuple[str, ...] = ()


@dataclass(frozen=True)
class ResourceAuthorizationHandler:
    """单对象资源约束处理器。"""

    key: str
    permission_codes: tuple[str, ...]
    authorize: Callable[..., Any]


@dataclass(frozen=True)
class ScopeFilterHandler:
    """列表 queryset 范围过滤处理器。"""

    key: str
    permission_code: str
    resource_model: type
    filter_queryset: Callable[..., Any]


@dataclass(frozen=True)
class AuthorizationSpec:
    """业务模块导出的管理态权限规格。"""

    key: str
    module: Optional[str] = None
    permissions: tuple[PermissionDefinition, ...] = ()
    resource_authorization_handlers: tuple[ResourceAuthorizationHandler, ...] = ()
    scope_filter_handlers: tuple[ScopeFilterHandler, ...] = ()


# 业务动作 → Django codename 动作前缀
CRUD_ACTIONS = ('view', 'create', 'update', 'delete')
DJANGO_CRUD_ACTION = {
    'view': 'view',
    'create': 'add',
    'update': 'change',
    'delete': 'delete',
}


def perm(code: str, **kwargs: Any) -> PermissionDefinition:
    return PermissionDefinition(code=code, implies=kwargs.get('implies', ()))


def django_permission_code(app_label: str, model: str, action: str) -> str:
    """app_label + model + CRUD 动作 → Django Permission 码，如 tasks.view_task。"""
    django_action = DJANGO_CRUD_ACTION.get(action, action)
    return f'{app_label}.{django_action}_{model}'


def crud_permissions(
    app_label: str,
    model: str,
    *,
    kwargs_by_action: Optional[dict[str, dict[str, Any]]] = None,
) -> tuple[PermissionDefinition, ...]:
    return tuple(
        PermissionDefinition(
            code=django_permission_code(app_label, model, action),
            implies=(kwargs_by_action or {}).get(action, {}).get('implies', ()),
        )
        for action in CRUD_ACTIONS
    )


def crud_authorization_spec(
    key: str,
    module: str,
    app_label: str,
    model: str,
    *,
    kwargs_by_action: Optional[dict[str, dict[str, Any]]] = None,
    **kwargs: Any,
) -> AuthorizationSpec:
    return AuthorizationSpec(
        key=key,
        module=module,
        permissions=crud_permissions(
            app_label,
            model,
            kwargs_by_action=kwargs_by_action,
        ),
        **kwargs,
    )


def _resolve_installed_app_module(app_entry: str) -> str:
    if '.apps.' not in app_entry:
        return app_entry
    return getattr(import_string(app_entry), 'name', app_entry)


@lru_cache(maxsize=1)
def discover_authorization_spec_modules() -> tuple[str, ...]:
    module_paths: list[str] = []
    for app_entry in settings.INSTALLED_APPS:
        app_module_path = _resolve_installed_app_module(app_entry)
        if not app_module_path.startswith('apps.'):
            continue
        app_module = import_module(app_module_path)
        if not module_has_submodule(app_module, 'authorization'):
            continue
        module_paths.append(f'{app_module_path}.authorization')
    return tuple(module_paths)


def _append_unique(target: list[str], value: str) -> None:
    if value not in target:
        target.append(value)


@lru_cache(maxsize=1)
def load_authorization_specs() -> tuple[AuthorizationSpec, ...]:
    specs: list[AuthorizationSpec] = []
    for module_path in discover_authorization_spec_modules():
        module = import_module(module_path)
        specs.extend(getattr(module, 'AUTHORIZATION_SPECS', ()))
    return tuple(specs)


def build_permission_catalog(specs: Optional[Iterable[AuthorizationSpec]] = None) -> list[dict[str, Any]]:
    resolved_specs = tuple(specs or load_authorization_specs())
    catalog: list[dict[str, Any]] = []
    seen_codes: set[str] = set()
    for spec in resolved_specs:
        for permission in spec.permissions:
            if permission.code in seen_codes:
                raise ValueError(f'重复权限编码: {permission.code}')
            if not spec.module:
                raise ValueError(f'权限 {permission.code} 缺少模块归属')
            seen_codes.add(permission.code)
            catalog.append(
                {
                    'code': permission.code,
                    'name': '',
                    'module': spec.module,
                    'implies': list(permission.implies),
                }
            )
    implication_map = build_permission_implication_map(resolved_specs)
    for item in catalog:
        item['implies'] = implication_map.get(item['code'], [])
    return catalog


def build_permission_implication_map(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> dict[str, list[str]]:
    resolved_specs = tuple(specs or load_authorization_specs())
    registered_codes = {
        permission.code
        for spec in resolved_specs
        for permission in spec.permissions
    }
    implication_map: dict[str, list[str]] = {code: [] for code in registered_codes}

    for spec in resolved_specs:
        for permission in spec.permissions:
            for implied_code in permission.implies:
                if implied_code not in registered_codes:
                    raise ValueError(f'权限 {permission.code} 依赖了未注册权限 {implied_code}')
                _append_unique(implication_map[permission.code], implied_code)

    # Django CRUD：add_/change_/delete_X 自动依赖 view_X
    for permission_code in registered_codes:
        app_and_codename = permission_code.split('.', 1)
        if len(app_and_codename) != 2:
            continue
        app_label, codename = app_and_codename
        for prefix in ('add_', 'change_', 'delete_'):
            if not codename.startswith(prefix):
                continue
            view_code = f'{app_label}.view_{codename[len(prefix):]}'
            if view_code in registered_codes:
                _append_unique(implication_map[permission_code], view_code)
            break

    return {
        permission_code: implied_codes
        for permission_code, implied_codes in implication_map.items()
        if implied_codes
    }


def build_resource_authorization_handlers(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> tuple[ResourceAuthorizationHandler, ...]:
    resolved_specs = tuple(specs or load_authorization_specs())
    handlers: list[ResourceAuthorizationHandler] = []
    seen_keys: set[str] = set()
    for spec in resolved_specs:
        for handler in spec.resource_authorization_handlers:
            if handler.key in seen_keys:
                continue
            seen_keys.add(handler.key)
            handlers.append(handler)
    return tuple(handlers)


def build_scope_filter_handlers(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> tuple[ScopeFilterHandler, ...]:
    resolved_specs = tuple(specs or load_authorization_specs())
    handlers: list[ScopeFilterHandler] = []
    seen_keys: set[str] = set()
    for spec in resolved_specs:
        for handler in spec.scope_filter_handlers:
            if handler.key in seen_keys:
                continue
            seen_keys.add(handler.key)
            handlers.append(handler)
    return tuple(handlers)


def expand_permission_codes(permission_codes: Iterable[str]) -> list[str]:
    """保存时补齐依赖权限（非运行时推导）。"""
    implication_map = build_permission_implication_map()
    expanded_codes: list[str] = []
    pending_codes = [code for code in permission_codes if code]
    while pending_codes:
        permission_code = pending_codes.pop(0)
        if permission_code in expanded_codes:
            continue
        expanded_codes.append(permission_code)
        pending_codes.extend(implication_map.get(permission_code, []))
    return expanded_codes
