"""从各业务模块收集权限声明与资源约束。"""

from dataclasses import dataclass, field
from functools import lru_cache
from importlib import import_module
from typing import Any, Callable, Iterable, Optional

from django.conf import settings
from django.utils.module_loading import import_string, module_has_submodule


@dataclass(frozen=True)
class PermissionDefinition:
    code: str
    name: str
    description: str


@dataclass(frozen=True)
class ResourceAuthorizationHandler:
    key: str
    permission_codes: tuple[str, ...]
    authorize: Callable[..., Any]
    constraint_summaries: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ScopeFilterHandler:
    key: str
    permission_code: str
    resource_model: type
    filter_queryset: Callable[..., Any]
    constraint_summary: str = ''


@dataclass(frozen=True)
class AuthorizationSpec:
    key: str
    module: Optional[str] = None
    permissions: tuple[PermissionDefinition, ...] = ()
    system_managed_codes: tuple[str, ...] = ()
    resource_authorization_handlers: tuple[ResourceAuthorizationHandler, ...] = ()
    scope_filter_handlers: tuple[ScopeFilterHandler, ...] = ()


CRUD_ACTIONS = ('view', 'create', 'update', 'delete')


def perm(code: str, name: str, description: str) -> PermissionDefinition:
    return PermissionDefinition(code=code, name=name, description=description)


def crud_permissions(
    prefix: str,
    label: str,
    *,
    names: Optional[dict[str, str]] = None,
    descriptions: Optional[dict[str, str]] = None,
) -> tuple[PermissionDefinition, ...]:
    resolved_names = {
        'view': f'查看{label}',
        'create': f'创建{label}',
        'update': f'更新{label}',
        'delete': f'删除{label}',
    } | (names or {})
    resolved_descriptions = {
        'view': f'查看{label}列表和详情',
        'create': f'创建{label}',
        'update': f'编辑{label}',
        'delete': f'删除{label}',
    } | (descriptions or {})
    return tuple(
        perm(
            code=f'{prefix}.{action}',
            name=resolved_names[action],
            description=resolved_descriptions[action],
        )
        for action in CRUD_ACTIONS
    )


def permission_codes(prefix: str, *actions: str) -> tuple[str, ...]:
    return tuple(f'{prefix}.{action}' for action in actions)


def crud_codes(prefix: str) -> tuple[str, ...]:
    return permission_codes(prefix, *CRUD_ACTIONS)


def crud_authorization_spec(
    key: str,
    module: str,
    prefix: str,
    label: str,
    *,
    names: Optional[dict[str, str]] = None,
    descriptions: Optional[dict[str, str]] = None,
    **kwargs: Any,
) -> AuthorizationSpec:
    return AuthorizationSpec(
        key=key,
        module=module,
        permissions=crud_permissions(
            prefix,
            label,
            names=names,
            descriptions=descriptions,
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
        if module_has_submodule(app_module, 'authorization'):
            module_paths.append(f'{app_module_path}.authorization')
    return tuple(module_paths)


@lru_cache(maxsize=1)
def load_authorization_specs() -> tuple[AuthorizationSpec, ...]:
    specs: list[AuthorizationSpec] = []
    for module_path in discover_authorization_spec_modules():
        module = import_module(module_path)
        specs.extend(getattr(module, 'AUTHORIZATION_SPECS', ()))
    return tuple(specs)


def build_permission_catalog(specs: Optional[Iterable[AuthorizationSpec]] = None) -> list[dict[str, str]]:
    catalog: list[dict[str, str]] = []
    seen_codes: set[str] = set()
    for spec in tuple(specs or load_authorization_specs()):
        for permission in spec.permissions:
            if permission.code in seen_codes:
                raise ValueError(f'重复权限编码: {permission.code}')
            if not spec.module:
                raise ValueError(f'权限 {permission.code} 缺少模块归属')
            seen_codes.add(permission.code)
            catalog.append({
                'code': permission.code,
                'name': permission.name,
                'module': spec.module,
                'description': permission.description,
            })
    return catalog


def build_system_managed_permission_codes(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> list[str]:
    codes: list[str] = []
    for spec in tuple(specs or load_authorization_specs()):
        for code in spec.system_managed_codes:
            if code not in codes:
                codes.append(code)
    return codes


def build_resource_authorization_handlers(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> tuple[ResourceAuthorizationHandler, ...]:
    handlers: list[ResourceAuthorizationHandler] = []
    seen_keys: set[str] = set()
    for spec in tuple(specs or load_authorization_specs()):
        for handler in spec.resource_authorization_handlers:
            if handler.key not in seen_keys:
                seen_keys.add(handler.key)
                handlers.append(handler)
    return tuple(handlers)


def build_scope_filter_handlers(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> tuple[ScopeFilterHandler, ...]:
    handlers: list[ScopeFilterHandler] = []
    seen_keys: set[str] = set()
    for spec in tuple(specs or load_authorization_specs()):
        for handler in spec.scope_filter_handlers:
            if handler.key not in seen_keys:
                seen_keys.add(handler.key)
                handlers.append(handler)
    return tuple(handlers)


def build_permission_constraint_summaries(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> dict[str, str]:
    summaries: dict[str, str] = {}
    for handler in build_resource_authorization_handlers(specs):
        summaries.update(handler.constraint_summaries)
    for handler in build_scope_filter_handlers(specs):
        if handler.constraint_summary and handler.permission_code not in summaries:
            summaries[handler.permission_code] = handler.constraint_summary
    return summaries
