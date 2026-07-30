"""Authorization service facade."""

from core.base_service import BaseService

from .permission_catalog_service import PermissionCatalogServiceMixin
from .user_permission_service import UserPermissionServiceMixin


class AuthorizationService(
    PermissionCatalogServiceMixin,
    UserPermissionServiceMixin,
    BaseService,
):
    """统一授权服务。"""
