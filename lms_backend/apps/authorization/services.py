"""Authorization service facade."""

from core.base_service import BaseService

from .final_authorization_service import FinalAuthorizationServiceMixin
from .permission_catalog_service import PermissionCatalogServiceMixin
from .policy_cache import AuthorizationPolicyCacheMixin


class AuthorizationService(
    AuthorizationPolicyCacheMixin,
    PermissionCatalogServiceMixin,
    FinalAuthorizationServiceMixin,
    BaseService,
):
    """Unified authorization service facade."""
