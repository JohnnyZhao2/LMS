"""Authorization constants derived from the registry."""

from .registry import (
    build_conditional_permission_codes,
    build_permission_catalog,
    build_permission_constraint_summaries,
    build_permission_implication_map,
    build_permission_scope_rules,
    build_resource_authorization_handlers,
    build_role_permission_defaults,
    build_role_system_permission_defaults,
    build_scope_group_rules,
    build_scope_filter_handlers,
    build_scope_aware_permission_codes,
    build_system_managed_permission_codes,
    load_authorization_specs,
)


AUTHORIZATION_SPECS = load_authorization_specs()
PERMISSION_CATALOG = build_permission_catalog(AUTHORIZATION_SPECS)
PERMISSION_CATALOG_BY_CODE = {item['code']: item for item in PERMISSION_CATALOG}
PERMISSION_IMPLIES_MAP = build_permission_implication_map(AUTHORIZATION_SPECS)
PERMISSION_SCOPE_GROUP_KEY_MAP = {
    item['code']: item.get('scope_group_key')
    for item in PERMISSION_CATALOG
}
REGISTERED_PERMISSION_CODES = frozenset(item['code'] for item in PERMISSION_CATALOG)

SYSTEM_MANAGED_PERMISSION_CODES = sorted(build_system_managed_permission_codes(AUTHORIZATION_SPECS))
ROLE_SYSTEM_PERMISSION_DEFAULTS = build_role_system_permission_defaults(AUTHORIZATION_SPECS)
ROLE_PERMISSION_DEFAULTS = build_role_permission_defaults(AUTHORIZATION_SPECS)

CONFIG_PERMISSION_MODULE = 'config'
CONFIG_PERMISSION_MANAGEABLE_ROLE = 'ADMIN'
CONFIG_MODULE_PERMISSION_CODES = frozenset(
    item['code']
    for item in PERMISSION_CATALOG
    if item.get('module') == CONFIG_PERMISSION_MODULE
)


SCOPE_ALL = 'ALL'
SCOPE_SELF = 'SELF'
SCOPE_MENTEES = 'MENTEES'
SCOPE_DEPARTMENT = 'DEPARTMENT'
SCOPE_EXPLICIT_USERS = 'EXPLICIT_USERS'

SCOPE_CHOICES = [
    (SCOPE_ALL, '全部对象'),
    (SCOPE_SELF, '本人数据'),
    (SCOPE_MENTEES, '仅名下学员'),
    (SCOPE_DEPARTMENT, '仅同部门'),
    (SCOPE_EXPLICIT_USERS, '指定用户'),
]

VISIBLE_SCOPE_CHOICES = [
    (SCOPE_ALL, '全部对象'),
    (SCOPE_SELF, '本人数据'),
    (SCOPE_MENTEES, '仅名下学员'),
    (SCOPE_DEPARTMENT, '仅同部门'),
    (SCOPE_EXPLICIT_USERS, '指定用户'),
]
DEFAULT_SCOPE_GROUP_ALLOWED_SCOPE_TYPES = tuple(scope_code for scope_code, _ in VISIBLE_SCOPE_CHOICES)

SCOPE_DESCRIPTIONS = {
    SCOPE_ALL: '对该角色下可访问的全部对象生效',
    SCOPE_SELF: '对本人相关数据生效',
    SCOPE_MENTEES: '对名下学员相关数据生效',
    SCOPE_DEPARTMENT: '对同部门对象生效',
    SCOPE_EXPLICIT_USERS: '仅对指定用户对象生效',
}


def _resolve_allowed_scope_types(catalog_item: dict) -> tuple[str, ...]:
    configured_scope_types = tuple(catalog_item.get('allowed_scope_types') or ())
    return configured_scope_types or DEFAULT_SCOPE_GROUP_ALLOWED_SCOPE_TYPES


PERMISSION_ALLOWED_SCOPE_TYPES_MAP = {
    item['code']: _resolve_allowed_scope_types(item)
    for item in PERMISSION_CATALOG
}


def _build_scope_groups() -> dict:
    scope_groups: dict[str, dict] = {}
    for item in PERMISSION_CATALOG:
        scope_group_key = item.get('scope_group_key')
        if not scope_group_key:
            continue

        allowed_scope_types = PERMISSION_ALLOWED_SCOPE_TYPES_MAP[item['code']]
        scope_group = scope_groups.setdefault(
            scope_group_key,
            {
                'permission_codes': [],
                'available_scope_types': allowed_scope_types,
            },
        )
        if tuple(scope_group['available_scope_types']) != tuple(allowed_scope_types):
            raise ValueError(f'范围组 {scope_group_key} 的可选范围配置不一致')
        scope_group['permission_codes'].append(item['code'])
    return scope_groups


PERMISSION_SCOPE_GROUPS = _build_scope_groups()

PERMISSION_SCOPE_RULES = build_permission_scope_rules(AUTHORIZATION_SPECS)
SCOPE_GROUP_RULES = build_scope_group_rules(AUTHORIZATION_SPECS)

SCOPE_AWARE_PERMISSION_CODES = build_scope_aware_permission_codes(AUTHORIZATION_SPECS)
RESOURCE_AUTHORIZATION_HANDLERS = build_resource_authorization_handlers(AUTHORIZATION_SPECS)
SCOPE_FILTER_HANDLERS = build_scope_filter_handlers(AUTHORIZATION_SPECS)
CONDITIONAL_PERMISSION_CODES = build_conditional_permission_codes(AUTHORIZATION_SPECS)
PERMISSION_CONSTRAINT_SUMMARIES = build_permission_constraint_summaries(AUTHORIZATION_SPECS)


EFFECT_ALLOW = 'ALLOW'
EFFECT_DENY = 'DENY'
EFFECT_CHOICES = [
    (EFFECT_ALLOW, '允许'),
    (EFFECT_DENY, '拒绝'),
]
