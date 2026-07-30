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
