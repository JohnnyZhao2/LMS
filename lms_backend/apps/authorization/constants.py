"""Authorization constants derived from the registry."""

from .registry import (
    build_permission_catalog,
    build_resource_authorization_handlers,
    build_scope_filter_handlers,
    load_authorization_specs,
)


AUTHORIZATION_SPECS = load_authorization_specs()
PERMISSION_CATALOG = build_permission_catalog(AUTHORIZATION_SPECS)
PERMISSION_CATALOG_BY_CODE = {item['code']: item for item in PERMISSION_CATALOG}
REGISTERED_PERMISSION_CODES = frozenset(item['code'] for item in PERMISSION_CATALOG)
RESOURCE_AUTHORIZATION_HANDLERS = build_resource_authorization_handlers(AUTHORIZATION_SPECS)
SCOPE_FILTER_HANDLERS = build_scope_filter_handlers(AUTHORIZATION_SPECS)
