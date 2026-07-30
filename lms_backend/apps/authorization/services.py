"""Authorization service facade."""

from core.base_service import BaseService

from .permission_catalog_service import PermissionCatalogServiceMixin
from .policy_cache import AuthorizationPolicyCacheMixin
from .role_capability_service import RoleCapabilityServiceMixin
from .user_override_service import UserOverrideServiceMixin


class AuthorizationService(
    AuthorizationPolicyCacheMixin,
    PermissionCatalogServiceMixin,
    RoleCapabilityServiceMixin,
    UserOverrideServiceMixin,
    BaseService,
):
    """Unified authorization service facade."""
