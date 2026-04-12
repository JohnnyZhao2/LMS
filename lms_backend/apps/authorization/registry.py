"""Authorization registry built from per-app specs."""

from collections import defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from importlib import import_module
from typing import Any, Callable, Iterable, Optional


@dataclass(frozen=True)
class PermissionDefinition:
    code: str
    name: str
    description: str
    scope_group_key: Optional[str] = None
    implies: tuple[str, ...] = ()


@dataclass(frozen=True)
class PermissionScopeRuleDefinition:
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
    scope_rules: tuple[PermissionScopeRuleDefinition, ...] = ()
    resource_authorization_handlers: tuple[ResourceAuthorizationHandler, ...] = ()
    scope_filter_handlers: tuple[ScopeFilterHandler, ...] = ()


AUTHORIZATION_SPEC_MODULES = (
    'apps.authorization.authorization',
    'apps.activity_logs.authorization',
    'apps.dashboard.authorization',
    'apps.grading.authorization',
    'apps.knowledge.authorization',
    'apps.questions.authorization',
    'apps.quizzes.authorization',
    'apps.spot_checks.authorization',
    'apps.submissions.authorization',
    'apps.tags.authorization',
    'apps.tasks.authorization',
    'apps.users.authorization',
)


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
    for module_path in AUTHORIZATION_SPEC_MODULES:
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
) -> list[PermissionScopeRuleDefinition]:
    resolved_specs = tuple(specs or load_authorization_specs())
    rules: list[PermissionScopeRuleDefinition] = []
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


def build_conditional_permission_codes(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> set[str]:
    conditional_codes = set(build_scope_aware_permission_codes(specs))
    for handler in build_resource_authorization_handlers(specs):
        conditional_codes.update(handler.constraint_summaries.keys())
    for handler in build_scope_filter_handlers(specs):
        if handler.constraint_summary:
            conditional_codes.add(handler.permission_code)
    return conditional_codes


def build_permission_constraint_summaries(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> dict[str, str]:
    summaries: dict[str, str] = {}
    for handler in build_resource_authorization_handlers(specs):
        summaries.update(handler.constraint_summaries)
    for handler in build_scope_filter_handlers(specs):
        if handler.constraint_summary and handler.permission_code not in summaries:
            summaries[handler.permission_code] = handler.constraint_summary

    scope_rules_by_permission: dict[str, list[PermissionScopeRuleDefinition]] = defaultdict(list)
    for rule in build_permission_scope_rules(specs):
        scope_rules_by_permission[rule.permission_code].append(rule)
    for permission_code, rules in scope_rules_by_permission.items():
        if permission_code in summaries:
            continue
        scope_labels = sorted({rule.scope_type for rule in rules})
        summaries[permission_code] = (
            f"按默认范围 {', '.join(scope_labels)} 生效，可通过用户授权按对象范围增删。"
        )
    return summaries
