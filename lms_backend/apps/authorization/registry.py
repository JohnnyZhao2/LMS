"""Authorization registry built from per-app specs."""

from collections import defaultdict
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
    scope_group_key: Optional[str] = None
    allowed_scope_types: Optional[tuple[str, ...]] = None
    implies: tuple[str, ...] = ()


@dataclass(frozen=True)
class DefaultScopeRuleDefinition:
    permission_code: str
    role_code: str
    scope_type: str


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
    role_defaults: dict[str, tuple[str, ...]] = field(default_factory=dict)
    role_system_defaults: dict[str, tuple[str, ...]] = field(default_factory=dict)
    scope_rules: tuple[DefaultScopeRuleDefinition, ...] = ()
    resource_authorization_handlers: tuple[ResourceAuthorizationHandler, ...] = ()
    scope_filter_handlers: tuple[ScopeFilterHandler, ...] = ()


CRUD_ACTIONS = ('view', 'create', 'update', 'delete')


def perm(code: str, name: str, description: str, **kwargs: Any) -> PermissionDefinition:
    return PermissionDefinition(code=code, name=name, description=description, **kwargs)


def crud_permissions(
    prefix: str,
    label: str,
    *,
    names: Optional[dict[str, str]] = None,
    descriptions: Optional[dict[str, str]] = None,
    kwargs_by_action: Optional[dict[str, dict[str, Any]]] = None,
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
            **(kwargs_by_action or {}).get(action, {}),
        )
        for action in CRUD_ACTIONS
    )


def permission_codes(prefix: str, *actions: str) -> tuple[str, ...]:
    return tuple(f'{prefix}.{action}' for action in actions)


def crud_codes(prefix: str) -> tuple[str, ...]:
    return permission_codes(prefix, *CRUD_ACTIONS)


def scope_rules(permission_code: str, **role_scopes: str) -> tuple[DefaultScopeRuleDefinition, ...]:
    return tuple(
        DefaultScopeRuleDefinition(permission_code, role_code, scope_type)
        for role_code, scope_type in role_scopes.items()
    )


def crud_authorization_spec(
    key: str,
    module: str,
    prefix: str,
    label: str,
    *,
    view_roles: tuple[str, ...] = (),
    full_roles: tuple[str, ...] = (),
    extra_role_defaults: Optional[dict[str, tuple[str, ...]]] = None,
    names: Optional[dict[str, str]] = None,
    descriptions: Optional[dict[str, str]] = None,
    kwargs_by_action: Optional[dict[str, dict[str, Any]]] = None,
    **kwargs: Any,
) -> AuthorizationSpec:
    full_role_codes = crud_codes(prefix)
    return AuthorizationSpec(
        key=key,
        module=module,
        permissions=crud_permissions(
            prefix,
            label,
            names=names,
            descriptions=descriptions,
            kwargs_by_action=kwargs_by_action,
        ),
        role_defaults={
            **{role: (f'{prefix}.view',) for role in view_roles},
            **{role: full_role_codes for role in full_roles},
            **(extra_role_defaults or {}),
        },
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


def _merge_sequence_map(specs: Iterable[AuthorizationSpec], attr_name: str) -> dict[str, list[str]]:
    merged: dict[str, list[str]] = {}
    for spec in specs:
        values = getattr(spec, attr_name)
        for key, codes in values.items():
            bucket = merged.setdefault(key, [])
            for code in codes:
                if code not in bucket:
                    bucket.append(code)
    return merged


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
    catalog: list[dict[str, str]] = []
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
                    'name': permission.name,
                    'module': spec.module,
                    'description': permission.description,
                    'scope_group_key': permission.scope_group_key,
                    'allowed_scope_types': list(permission.allowed_scope_types or ()),
                    'implies': [],
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

    for permission_code in registered_codes:
        if not permission_code.endswith(('.create', '.update', '.delete')):
            continue
        view_code = f"{permission_code.rsplit('.', 1)[0]}.view"
        if view_code in registered_codes:
            _append_unique(implication_map[permission_code], view_code)

    return {
        permission_code: implied_codes
        for permission_code, implied_codes in implication_map.items()
        if implied_codes
    }


def build_system_managed_permission_codes(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> list[str]:
    resolved_specs = tuple(specs or load_authorization_specs())
    codes: list[str] = []
    for spec in resolved_specs:
        for code in spec.system_managed_codes:
            if code not in codes:
                codes.append(code)
    return codes


def build_role_permission_defaults(specs: Optional[Iterable[AuthorizationSpec]] = None) -> dict[str, list[str]]:
    return _merge_sequence_map(tuple(specs or load_authorization_specs()), 'role_defaults')


def build_role_system_permission_defaults(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> dict[str, list[str]]:
    return _merge_sequence_map(tuple(specs or load_authorization_specs()), 'role_system_defaults')


def build_permission_scope_rules(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> list[DefaultScopeRuleDefinition]:
    resolved_specs = tuple(specs or load_authorization_specs())
    rules: list[DefaultScopeRuleDefinition] = []
    seen_keys: set[tuple[str, str, str]] = set()
    for spec in resolved_specs:
        for rule in spec.scope_rules:
            cache_key = (rule.permission_code, rule.role_code, rule.scope_type)
            if cache_key in seen_keys:
                continue
            seen_keys.add(cache_key)
            rules.append(rule)
    return rules


def build_scope_aware_permission_codes(specs: Optional[Iterable[AuthorizationSpec]] = None) -> set[str]:
    return {rule.permission_code for rule in build_permission_scope_rules(specs)}


def build_scope_group_rules(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> list[dict[str, str]]:
    resolved_specs = tuple(specs or load_authorization_specs())
    permission_catalog = build_permission_catalog(resolved_specs)
    permission_scope_group_map = {
        item['code']: item.get('scope_group_key')
        for item in permission_catalog
        if item.get('scope_group_key')
    }
    rules: list[dict[str, str]] = []
    seen_keys: set[tuple[str, str, str]] = set()
    for rule in build_permission_scope_rules(resolved_specs):
        scope_group_key = permission_scope_group_map.get(rule.permission_code)
        if not scope_group_key:
            continue
        cache_key = (scope_group_key, rule.role_code, rule.scope_type)
        if cache_key in seen_keys:
            continue
        seen_keys.add(cache_key)
        rules.append(
            {
                'scope_group_key': scope_group_key,
                'role_code': rule.role_code,
                'scope_type': rule.scope_type,
            }
        )
    return rules


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


def build_permission_constraint_summaries(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> dict[str, str]:
    summaries: dict[str, str] = {}
    for handler in build_resource_authorization_handlers(specs):
        summaries.update(handler.constraint_summaries)
    for handler in build_scope_filter_handlers(specs):
        if handler.constraint_summary and handler.permission_code not in summaries:
            summaries[handler.permission_code] = handler.constraint_summary

    scope_rules_by_permission: dict[str, list[DefaultScopeRuleDefinition]] = defaultdict(list)
    for rule in build_permission_scope_rules(specs):
        scope_rules_by_permission[rule.permission_code].append(rule)
    for permission_code, rules in scope_rules_by_permission.items():
        if permission_code in summaries:
            continue
        summaries[permission_code] = '对象范围'
    return summaries
