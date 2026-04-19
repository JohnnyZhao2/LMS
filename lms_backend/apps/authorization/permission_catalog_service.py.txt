from typing import Optional

from django.db import transaction

from .constants import PERMISSION_CATALOG, PERMISSION_SCOPE_RULES, ROLE_PERMISSION_DEFAULTS
from .models import Permission, PermissionScopeRule, RolePermission
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
    def sync_permission_scope_rules() -> None:
        permission_map = {
            permission.code: permission
            for permission in Permission.objects.filter(
                code__in=[rule.permission_code for rule in PERMISSION_SCOPE_RULES],
                is_active=True,
            )
        }
        desired_keys: set[tuple[int, str, str]] = set()
        managed_permission_codes = {rule.permission_code for rule in PERMISSION_SCOPE_RULES}
        for rule in PERMISSION_SCOPE_RULES:
            permission = permission_map.get(rule.permission_code)
            if permission is None:
                continue
            desired_keys.add((permission.id, rule.role_code, rule.scope_type))
            PermissionScopeRule.objects.update_or_create(
                permission=permission,
                role_code=rule.role_code,
                scope_type=rule.scope_type,
                defaults={'is_active': True},
            )

        stale_rules = PermissionScopeRule.objects.filter(permission__code__in=managed_permission_codes)
        for scope_rule in stale_rules.select_related('permission'):
            cache_key = (scope_rule.permission_id, scope_rule.role_code, scope_rule.scope_type)
            if cache_key not in desired_keys:
                scope_rule.delete()

    @staticmethod
    @transaction.atomic
    def ensure_defaults(
        *,
        sync_role_templates: bool = False,
        overwrite_existing_role_templates: bool = False,
    ) -> None:
        PermissionCatalogServiceMixin.sync_permission_catalog()
        PermissionCatalogServiceMixin.sync_permission_scope_rules()
        if sync_role_templates:
            if overwrite_existing_role_templates:
                RolePermission.objects.filter(role__code__in=ROLE_PERMISSION_DEFAULTS.keys()).delete()
