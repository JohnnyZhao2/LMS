from typing import Optional

from django.db import transaction

from .constants import PERMISSION_CATALOG
from .models import Permission
from .selectors import list_permissions


class PermissionCatalogServiceMixin:
    def list_permission_catalog(
        self,
        module: Optional[str] = None,
    ):
        return list_permissions(module=module)

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
        Permission.objects.exclude(
            code__in=[item['code'] for item in PERMISSION_CATALOG]
        ).delete()

    @staticmethod
    @transaction.atomic
    def ensure_defaults() -> None:
        PermissionCatalogServiceMixin.sync_permission_catalog()
