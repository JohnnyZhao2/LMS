"""Permission constraint summaries derived from authorization specs."""

from .constants import PERMISSION_CONSTRAINT_SUMMARIES

ROLE_TEMPLATE_HIDDEN_PERMISSION_CODES = frozenset({
    'analytics.view',
})


def get_permission_constraint_summary(permission_code: str) -> str:
    return PERMISSION_CONSTRAINT_SUMMARIES.get(permission_code, '')


def is_permission_visible_in_role_template(permission_code: str) -> bool:
    return permission_code not in ROLE_TEMPLATE_HIDDEN_PERMISSION_CODES
