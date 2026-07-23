"""从各业务模块收集权限声明。

权限系统的真相源在每个 app 自己的 `authorization.py`。本文件只负责发现、
合并、去重和构建运行时常量，不直接写死业务权限。
"""

from dataclasses import dataclass, field
from functools import lru_cache
from importlib import import_module
from typing import Any, Callable, Iterable, Optional

from django.conf import settings
from django.utils.module_loading import import_string, module_has_submodule

SCOPE_KIND_NONE = 'NONE'
SCOPE_KIND_DATA = 'DATA'
SCOPE_KIND_TARGET = 'TARGET'
SCOPE_KINDS = frozenset({SCOPE_KIND_NONE, SCOPE_KIND_DATA, SCOPE_KIND_TARGET})

SCOPE_OWN = 'OWN'
SCOPE_ALL = 'ALL'
SCOPE_SELF = 'SELF'
SCOPE_MENTEES = 'MENTEES'
SCOPE_DEPARTMENT = 'DEPARTMENT'
SCOPE_EXPLICIT_USERS = 'EXPLICIT_USERS'

DATA_SCOPE_TYPES = frozenset({SCOPE_OWN, SCOPE_DEPARTMENT, SCOPE_ALL})
TARGET_SCOPE_TYPES = frozenset({
    SCOPE_SELF,
    SCOPE_MENTEES,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_ALL,
})

VALID_ROLE_CODES = frozenset({
    'STUDENT',
    'MENTOR',
    'DEPT_MANAGER',
    'TEAM_MANAGER',
    'ADMIN',
})


@dataclass(frozen=True)
class PermissionDefinition:
    """单个权限点的声明。"""

    code: str
    name: str
    description: str
    scope_kind: str = SCOPE_KIND_NONE
    scope_group_key: Optional[str] = None
    allowed_scope_types: tuple[str, ...] = ()
    implies: tuple[str, ...] = ()
    is_configurable: bool = True
    required_role_codes: tuple[str, ...] = ()


@dataclass(frozen=True)
class ResourceAuthorizationHandler:
    """单对象资源约束处理器。"""

    key: str
    permission_codes: tuple[str, ...]
    authorize: Callable[..., Any]
    constraint_summaries: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class ScopeFilterHandler:
    """列表 queryset 范围过滤处理器。"""

    key: str
    permission_code: str
    resource_model: type
    filter_queryset: Callable[..., Any]
    constraint_summary: str = ''


@dataclass(frozen=True)
class AuthorizationSpec:
    """一个业务模块导出的完整权限规格。"""

    key: str
    module: Optional[str] = None
    permissions: tuple[PermissionDefinition, ...] = ()
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


def crud_authorization_spec(
    key: str,
    module: str,
    prefix: str,
    label: str,
    *,
    names: Optional[dict[str, str]] = None,
    descriptions: Optional[dict[str, str]] = None,
    kwargs_by_action: Optional[dict[str, dict[str, Any]]] = None,
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
    """按 INSTALLED_APPS 自动发现 `apps.*.authorization` 模块。"""
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
    validate_authorization_specs(tuple(specs))
    return tuple(specs)


def validate_authorization_specs(specs: tuple[AuthorizationSpec, ...]) -> None:
    """注册表启动校验。"""
    seen_codes: dict[str, PermissionDefinition] = {}
    for spec in specs:
        for permission in spec.permissions:
            if permission.code in seen_codes:
                raise ValueError(f'重复权限编码: {permission.code}')
            seen_codes[permission.code] = permission

    scope_groups: dict[str, dict[str, Any]] = {}
    for permission in seen_codes.values():
        if permission.scope_kind not in SCOPE_KINDS:
            raise ValueError(f'权限 {permission.code} 的 scope_kind 非法: {permission.scope_kind}')

        if permission.scope_kind == SCOPE_KIND_NONE:
            if permission.scope_group_key or permission.allowed_scope_types:
                raise ValueError(f'权限 {permission.code} 为 NONE 时不得声明范围组或允许范围')
        else:
            if not permission.scope_group_key:
                raise ValueError(f'权限 {permission.code} 缺少 scope_group_key')
            if not permission.allowed_scope_types:
                raise ValueError(f'权限 {permission.code} 缺少 allowed_scope_types')

            allowed = set(permission.allowed_scope_types)
            if permission.scope_kind == SCOPE_KIND_DATA and not allowed.issubset(DATA_SCOPE_TYPES):
                raise ValueError(f'权限 {permission.code} 的 DATA 范围类型非法: {permission.allowed_scope_types}')
            if permission.scope_kind == SCOPE_KIND_TARGET and not allowed.issubset(TARGET_SCOPE_TYPES):
                raise ValueError(f'权限 {permission.code} 的 TARGET 范围类型非法: {permission.allowed_scope_types}')

            group = scope_groups.setdefault(
                permission.scope_group_key,
                {
                    'scope_kind': permission.scope_kind,
                    'allowed_scope_types': tuple(permission.allowed_scope_types),
                    'permission_codes': [],
                },
            )
            if group['scope_kind'] != permission.scope_kind:
                raise ValueError(f'范围组 {permission.scope_group_key} 的 scope_kind 不一致')
            if tuple(group['allowed_scope_types']) != tuple(permission.allowed_scope_types):
                raise ValueError(f'范围组 {permission.scope_group_key} 的允许范围不一致')
            group['permission_codes'].append(permission.code)

        if permission.is_configurable and permission.required_role_codes:
            raise ValueError(f'可配置权限 {permission.code} 不得声明 required_role_codes')
        for role_code in permission.required_role_codes:
            if role_code not in VALID_ROLE_CODES:
                raise ValueError(f'权限 {permission.code} 的 required_role_codes 含无效角色: {role_code}')

        for implied_code in permission.implies:
            if implied_code not in seen_codes:
                raise ValueError(f'权限 {permission.code} 依赖了未注册权限 {implied_code}')


def build_scope_group_catalog(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> dict[str, dict[str, Any]]:
    """构建统一范围组目录。"""
    resolved_specs = tuple(specs or load_authorization_specs())
    catalog: dict[str, dict[str, Any]] = {}
    for spec in resolved_specs:
        for permission in spec.permissions:
            if not permission.scope_group_key:
                continue
            group = catalog.setdefault(
                permission.scope_group_key,
                {
                    'scope_kind': permission.scope_kind,
                    'allowed_scope_types': tuple(permission.allowed_scope_types),
                    'permission_codes': [],
                },
            )
            group['permission_codes'].append(permission.code)
    return catalog


def build_permission_catalog(specs: Optional[Iterable[AuthorizationSpec]] = None) -> list[dict[str, Any]]:
    """生成同步到数据库和前端展示的权限目录。"""
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
                    'name': permission.name,
                    'module': spec.module,
                    'description': permission.description,
                    'scope_kind': permission.scope_kind,
                    'scope_group_key': permission.scope_group_key,
                    'allowed_scope_types': list(permission.allowed_scope_types),
                    'is_configurable': permission.is_configurable,
                    'required_role_codes': list(permission.required_role_codes),
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
    """生成隐含权限关系。

    例如 create/update/delete 自动隐含 view，避免页面拥有写权限却无法读取详情。
    """
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


def build_fixed_permission_required_roles(
    specs: Optional[Iterable[AuthorizationSpec]] = None,
) -> dict[str, tuple[str, ...]]:
    resolved_specs = tuple(specs or load_authorization_specs())
    return {
        permission.code: permission.required_role_codes
        for spec in resolved_specs
        for permission in spec.permissions
        if not permission.is_configurable
    }


def build_scope_aware_permission_codes(specs: Optional[Iterable[AuthorizationSpec]] = None) -> set[str]:
    resolved_specs = tuple(specs or load_authorization_specs())
    return {
        permission.code
        for spec in resolved_specs
        for permission in spec.permissions
        if permission.scope_kind != SCOPE_KIND_NONE
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
