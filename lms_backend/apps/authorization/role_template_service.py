from typing import Iterable, List, Optional, Set

from django.db import transaction

from apps.activity_logs.decorators import log_operation
from apps.authorization.roles import SUPER_ADMIN_ROLE
from apps.users.models import Role
from core.exceptions import BusinessError, ErrorCodes

from .constants import (
    CONFIG_MODULE_PERMISSION_CODES,
    CONFIG_PERMISSION_MANAGEABLE_ROLE,
    EFFECT_ALLOW,
    EFFECT_DENY,
    PERMISSION_IMPLIES_MAP,
    PERMISSION_SCOPE_GROUPS,
    ROLE_PERMISSION_DEFAULTS,
    ROLE_SYSTEM_PERMISSION_DEFAULTS,
    SCOPE_ALL,
    SYSTEM_MANAGED_PERMISSION_CODES,
)
from .models import Permission, RolePermission
from .selectors import get_permissions_by_codes


class RoleTemplateServiceMixin:
    @staticmethod
    def _expand_permission_codes(permission_codes: Iterable[str]) -> List[str]:
        expanded_codes: list[str] = []
        pending_codes = [code for code in permission_codes if code]
        while pending_codes:
            permission_code = pending_codes.pop(0)
            if permission_code in expanded_codes:
                continue
            expanded_codes.append(permission_code)
            pending_codes.extend(PERMISSION_IMPLIES_MAP.get(permission_code, []))
        return expanded_codes

    @staticmethod
    def _can_manage_config_permissions(role_code: Optional[str]) -> bool:
        return role_code == CONFIG_PERMISSION_MANAGEABLE_ROLE

    @staticmethod
    def _get_system_role_permission_code_set(role_code: str) -> Set[str]:
        return set(ROLE_SYSTEM_PERMISSION_DEFAULTS.get(role_code, []))

    @staticmethod
    def validate_role_code(role_code: str) -> Optional[Role]:
        if role_code == SUPER_ADMIN_ROLE:
            return None
        return Role.objects.filter(code=role_code).first()

    @classmethod
    def _get_role_default_permission_code_set(cls, role_code: str) -> Set[str]:
        return cls._normalize_role_permission_codes(
            role_code,
            ROLE_PERMISSION_DEFAULTS.get(role_code, []),
        )

    @classmethod
    def _get_role_configurable_default_permission_code_set(cls, role_code: str) -> Set[str]:
        return cls._get_role_default_permission_code_set(role_code) - cls._get_system_role_permission_code_set(role_code)

    @classmethod
    def _normalize_role_permission_codes(
        cls,
        role_code: str,
        permission_codes: Iterable[str],
    ) -> Set[str]:
        normalized_codes = {code for code in permission_codes if code}
        if not cls._can_manage_config_permissions(role_code):
            normalized_codes -= set(CONFIG_MODULE_PERMISSION_CODES)
        normalized_codes -= set(SYSTEM_MANAGED_PERMISSION_CODES)
        normalized_codes |= cls._get_system_role_permission_code_set(role_code)
        return normalized_codes

    @classmethod
    def _get_role_permission_override_code_sets(cls, role_code: str) -> tuple[Set[str], Set[str]]:
        rows = RolePermission.objects.filter(
            role__code=role_code,
            permission__is_active=True,
        ).values_list('permission__code', 'effect')
        allow_codes = set()
        deny_codes = set()
        for permission_code, effect in rows:
            if effect == EFFECT_DENY:
                deny_codes.add(permission_code)
            else:
                allow_codes.add(permission_code)
        allow_codes = cls._normalize_role_permission_codes(role_code, allow_codes)
        deny_codes -= cls._get_system_role_permission_code_set(role_code)
        deny_codes &= cls._get_role_configurable_default_permission_code_set(role_code) | allow_codes
        return allow_codes, deny_codes

    @classmethod
    def _get_role_permission_code_set(cls, role_code: str) -> Set[str]:
        default_codes = cls._get_role_default_permission_code_set(role_code)
        allow_codes, deny_codes = cls._get_role_permission_override_code_sets(role_code)
        return cls._normalize_role_permission_codes(
            role_code,
            (default_codes | allow_codes) - deny_codes,
        )

    def get_role_permission_codes(self, role_code: str) -> List[str]:
        if role_code == SUPER_ADMIN_ROLE:
            all_codes = set(Permission.objects.filter(is_active=True).values_list('code', flat=True))
            all_codes.update(SYSTEM_MANAGED_PERMISSION_CODES)
            return sorted(all_codes)
        self.validate_not_none(
            self.validate_role_code(role_code),
            f'角色 {role_code} 不存在',
        )
        return sorted(self._get_role_permission_code_set(role_code))

    def get_role_default_scope_types(self, role_code: str) -> List[str]:
        if role_code == SUPER_ADMIN_ROLE:
            return [SCOPE_ALL]
        self.validate_not_none(
            self.validate_role_code(role_code),
            f'角色 {role_code} 不存在',
        )
        scope_types: list[str] = []
        for scope_group in self.get_role_scope_groups(role_code):
            for scope_type in scope_group['default_scope_types']:
                if scope_type not in scope_types:
                    scope_types.append(scope_type)
        return scope_types

    def get_role_scope_groups(self, role_code: str) -> List[dict]:
        if role_code == SUPER_ADMIN_ROLE:
            return [
                {
                    'key': scope_group_key,
                    'permission_codes': scope_group['permission_codes'],
                    'default_scope_types': [SCOPE_ALL],
                }
                for scope_group_key, scope_group in sorted(PERMISSION_SCOPE_GROUPS.items())
            ]

        self.validate_not_none(
            self.validate_role_code(role_code),
            f'角色 {role_code} 不存在',
        )

        scope_groups: list[dict] = []
        for scope_group_key, scope_group in sorted(PERMISSION_SCOPE_GROUPS.items()):
            default_scope_types = self._get_scope_group_scope_types(
                scope_group_key=scope_group_key,
                current_role=role_code,
            )
            scope_groups.append({
                'key': scope_group_key,
                'permission_codes': scope_group['permission_codes'],
                'default_scope_types': default_scope_types,
            })
        return scope_groups

    @transaction.atomic
    @log_operation(
        'authorization',
        'replace_role_permissions',
        '{permission_count} 项权限',
        target_type='role',
        target_title_template='{role_code}',
        group='角色模板',
        label='更新角色模板权限',
    )
    def replace_role_permissions(
        self,
        role_code: str,
        permission_codes: Iterable[str],
    ) -> List[str]:
        if role_code == SUPER_ADMIN_ROLE:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管为系统专有角色，不支持配置模板权限',
            )
        requested_codes = self._expand_permission_codes(permission_codes)
        if not self._can_manage_config_permissions(role_code):
            forbidden_codes = sorted(set(requested_codes) & set(CONFIG_MODULE_PERMISSION_CODES))
            if forbidden_codes:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'配置管理权限仅支持管理员角色，非法权限: {forbidden_codes}',
                )
        role = self.validate_not_none(self.validate_role_code(role_code), f'角色 {role_code} 不存在')

        normalized_codes = sorted(self._normalize_role_permission_codes(role_code, requested_codes))
        system_codes = set(normalized_codes) & set(SYSTEM_MANAGED_PERMISSION_CODES)
        persisted_codes = sorted(set(normalized_codes) - system_codes)
        permission_objects = get_permissions_by_codes(persisted_codes)
        resolved_codes = {item.code for item in permission_objects}
        missing_codes = sorted(set(persisted_codes) - resolved_codes)
        if missing_codes:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'存在无效权限编码: {missing_codes}',
            )
        resolved_codes |= system_codes

        default_codes = self._get_role_configurable_default_permission_code_set(role_code)
        requested_configurable_codes = resolved_codes - self._get_system_role_permission_code_set(role_code)
        allow_codes = sorted(requested_configurable_codes - default_codes)
        deny_codes = sorted(default_codes - requested_configurable_codes)
        deny_permissions = Permission.objects.filter(code__in=deny_codes, is_active=True)

        RolePermission.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create(
            [
                RolePermission(
                    role=role,
                    permission=permission,
                    effect=EFFECT_ALLOW,
                )
                for permission in permission_objects
                if permission.code in allow_codes
            ]
            + [
                RolePermission(
                    role=role,
                    permission=permission,
                    effect=EFFECT_DENY,
                )
                for permission in deny_permissions
            ],
            batch_size=500,
        )

        return sorted(self._get_role_permission_code_set(role_code))
