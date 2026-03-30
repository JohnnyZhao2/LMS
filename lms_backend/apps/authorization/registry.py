"""Authorization registry built from per-app specs."""

from dataclasses import dataclass, field
from functools import lru_cache
from importlib import import_module
from typing import Iterable, Optional


@dataclass(frozen=True)
class PermissionDefinition:
    code: str
    name: str
    description: str


@dataclass(frozen=True)
class AuthorizationSpec:
    key: str
    module: Optional[str] = None
    permissions: tuple[PermissionDefinition, ...] = ()
    system_managed_codes: tuple[str, ...] = ()
    role_defaults: dict[str, tuple[str, ...]] = field(default_factory=dict)
    role_system_defaults: dict[str, tuple[str, ...]] = field(default_factory=dict)
    role_default_scopes: dict[str, tuple[str, ...]] = field(default_factory=dict)
    scope_aware_permissions: tuple[str, ...] = ()


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


@lru_cache(maxsize=1)
def load_authorization_specs() -> tuple[AuthorizationSpec, ...]:
    specs: list[AuthorizationSpec] = []
    for module_path in AUTHORIZATION_SPEC_MODULES:
        module = import_module(module_path)
        specs.extend(getattr(module, 'AUTHORIZATION_SPECS', ()))
    return tuple(specs)


def build_permission_catalog(specs: Optional[Iterable[AuthorizationSpec]] = None) -> list[dict[str, str]]:
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
                }
            )
    return catalog


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


def build_role_default_scope_types(specs: Optional[Iterable[AuthorizationSpec]] = None) -> dict[str, list[str]]:
    return _merge_sequence_map(tuple(specs or load_authorization_specs()), 'role_default_scopes')


def build_scope_aware_permission_codes(specs: Optional[Iterable[AuthorizationSpec]] = None) -> set[str]:
    resolved_specs = tuple(specs or load_authorization_specs())
    codes: list[str] = []
    for spec in resolved_specs:
        for code in spec.scope_aware_permissions:
            if code not in codes:
                codes.append(code)
    return set(codes)
