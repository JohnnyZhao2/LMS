"""Authorization service facade."""

from core.base_service import BaseService

from .permission_catalog_service import PermissionCatalogServiceMixin
from .policy_cache import AuthorizationPolicyCacheMixin
from .role_template_service import RoleTemplateServiceMixin
from .user_override_service import UserOverrideServiceMixin


class AuthorizationService(
    AuthorizationPolicyCacheMixin,
    PermissionCatalogServiceMixin,
    RoleTemplateServiceMixin,
    UserOverrideServiceMixin,
    BaseService,
):
    """Unified authorization service facade."""
