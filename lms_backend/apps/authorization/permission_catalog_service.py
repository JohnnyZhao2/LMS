"""权限目录同步。"""

from typing import Optional

from django.db import transaction

from apps.users.models import Role, UserRole

from .constants import FIXED_PERMISSION_REQUIRED_ROLES, PERMISSION_CATALOG
from .final_authorization_service import (
    cleanup_orphan_role_scopes,
    cleanup_orphan_user_role_scopes,
)
from .models import Permission, RolePermission, UserRolePermission
from .selectors import list_permissions


class PermissionCatalogServiceMixin:
    def list_permission_catalog(
        self,
        module: Optional[str] = None,
        catalog_view: Optional[str] = None,
    ):
        return list_permissions(module=module, catalog_view=catalog_view)

    @staticmethod
    @transaction.atomic
    def sync_permission_catalog() -> None:
        """同步注册表到 Permission，并强制固定权限归属。

        - 新权限默认不授予任何人
        - 下线权限：is_active=False，删除角色/用户授权，保留目录行
        - 固定权限按 required_role_codes 强制写入/移出 RolePermission，并同步已有 UserRolePermission
        """
        catalog_by_code = {item['code']: item for item in PERMISSION_CATALOG}
        catalog_codes = set(catalog_by_code)

        for item in PERMISSION_CATALOG:
            Permission.objects.update_or_create(
                code=item['code'],
                defaults={
                    'name': item['name'],
                    'module': item['module'],
                    'description': item['description'],
                    'is_active': True,
                    'is_configurable': bool(item.get('is_configurable', True)),
                },
            )

        retired_permissions = list(Permission.objects.exclude(code__in=catalog_codes))
        retired_codes = [permission.code for permission in retired_permissions]
        if retired_codes:
            RolePermission.objects.filter(permission__code__in=retired_codes).delete()
            UserRolePermission.objects.filter(permission__code__in=retired_codes).delete()
            Permission.objects.filter(code__in=retired_codes).update(is_active=False)

        PermissionCatalogServiceMixin._sync_fixed_permissions()
        for role in Role.objects.all():
            cleanup_orphan_role_scopes(role)
        for user_role in UserRole.objects.select_related('role').all():
            cleanup_orphan_user_role_scopes(user_role)

    @staticmethod
    def _sync_fixed_permissions() -> None:
        """按 required_role_codes 强制固定权限归属。"""
        roles_by_code = {role.code: role for role in Role.objects.all()}
        UserRolePermission.objects.filter(user_role__role__code='STUDENT').delete()
        for permission_code, required_roles in FIXED_PERMISSION_REQUIRED_ROLES.items():
            permission = Permission.objects.filter(code=permission_code, is_active=True).first()
            if permission is None:
                continue

            required_role_set = set(required_roles)
            RolePermission.objects.filter(permission=permission).exclude(
                role__code__in=required_role_set
            ).delete()
            UserRolePermission.objects.filter(permission=permission).exclude(
                user_role__role__code__in=required_role_set
            ).delete()

            for role_code in required_roles:
                role = roles_by_code.get(role_code)
                if role is None:
                    continue
                RolePermission.objects.get_or_create(role=role, permission=permission)
                if role_code == 'STUDENT':
                    continue
                for user_role in UserRole.objects.filter(role=role):
                    UserRolePermission.objects.get_or_create(
                        user_role=user_role,
                        permission=permission,
                    )

    @staticmethod
    @transaction.atomic
    def ensure_defaults() -> None:
        """同步权限目录。模板完整状态由 migration / 管理接口维护。"""
        PermissionCatalogServiceMixin.sync_permission_catalog()
