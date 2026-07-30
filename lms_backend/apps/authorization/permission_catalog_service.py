from typing import Optional

from django.db import transaction

from apps.authorization.roles import STUDENT_ROLE

from .constants import PERMISSION_CATALOG
from .models import Permission, RolePermission
from .selectors import list_permissions


class PermissionCatalogServiceMixin:
    def list_permission_catalog(
        self,
        module: Optional[str] = None,
        catalog_view: Optional[str] = None,
    ):
        return list_permissions(module=module, catalog_view=catalog_view)

    @staticmethod
    def sync_permission_catalog() -> None:
        for item in PERMISSION_CATALOG:
            Permission.objects.update_or_create(
                code=item['code'],
                defaults={
                    'name': item['name'],
                    'module': item['module'],
                    'description': item['description'],
                    'is_active': True,
                },
            )

        Permission.objects.exclude(code__in=[item['code'] for item in PERMISSION_CATALOG]).delete()

    @staticmethod
    def _clear_legacy_role_permission_rows() -> None:
        """角色能力已改为代码声明，清理历史 RolePermission / 学员残留。"""
        RolePermission.objects.filter(role__code=STUDENT_ROLE).delete()
        RolePermission.objects.all().delete()

    @staticmethod
    @transaction.atomic
    def ensure_defaults() -> None:
        from apps.users.role_constraints import repair_conflicting_auth_roles

        PermissionCatalogServiceMixin.sync_permission_catalog()
        PermissionCatalogServiceMixin._clear_legacy_role_permission_rows()
        repair_conflicting_auth_roles()
