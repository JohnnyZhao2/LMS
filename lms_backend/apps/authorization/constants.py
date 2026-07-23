"""Authorization constants derived from the registry."""

from .registry import (
    SCOPE_ALL,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_MENTEES,
    SCOPE_OWN,
    SCOPE_SELF,
    build_fixed_permission_required_roles,
    build_permission_catalog,
    build_permission_constraint_summaries,
    build_permission_implication_map,
    build_resource_authorization_handlers,
    build_scope_group_catalog,
    build_scope_filter_handlers,
    build_scope_aware_permission_codes,
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

FIXED_PERMISSION_REQUIRED_ROLES = build_fixed_permission_required_roles(AUTHORIZATION_SPECS)
SCOPE_GROUP_CATALOG = build_scope_group_catalog(AUTHORIZATION_SPECS)

CONFIG_PERMISSION_MODULE = 'config'
CONFIG_PERMISSION_MANAGEABLE_ROLE = 'ADMIN'
CONFIG_MODULE_PERMISSION_CODES = frozenset(
    item['code']
    for item in PERMISSION_CATALOG
    if item.get('module') == CONFIG_PERMISSION_MODULE
)


SCOPE_CHOICES = [
    (SCOPE_ALL, '全部对象'),
    (SCOPE_OWN, '本人创建'),
    (SCOPE_SELF, '本人数据'),
    (SCOPE_MENTEES, '仅名下学员'),
    (SCOPE_DEPARTMENT, '仅同部门'),
    (SCOPE_EXPLICIT_USERS, '指定用户'),
]

PERMISSION_ALLOWED_SCOPE_TYPES_MAP = {
    item['code']: tuple(item.get('allowed_scope_types') or ())
    for item in PERMISSION_CATALOG
}

SCOPE_AWARE_PERMISSION_CODES = build_scope_aware_permission_codes(AUTHORIZATION_SPECS)
RESOURCE_AUTHORIZATION_HANDLERS = build_resource_authorization_handlers(AUTHORIZATION_SPECS)
SCOPE_FILTER_HANDLERS = build_scope_filter_handlers(AUTHORIZATION_SPECS)
PERMISSION_CONSTRAINT_SUMMARIES = build_permission_constraint_summaries(AUTHORIZATION_SPECS)
