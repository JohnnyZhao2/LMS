from typing import Optional

from django.db import transaction

from .constants import PERMISSION_CATALOG, ROLE_PERMISSION_DEFAULTS
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
    @transaction.atomic
    def ensure_defaults(
        *,
        sync_role_templates: bool = False,
        overwrite_existing_role_templates: bool = False,
    ) -> None:
        PermissionCatalogServiceMixin.sync_permission_catalog()
        if sync_role_templates:
            if overwrite_existing_role_templates:
                RolePermission.objects.filter(role__code__in=ROLE_PERMISSION_DEFAULTS.keys()).delete()
