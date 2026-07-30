from typing import List, Optional

from django.db import transaction

from apps.activity_logs.decorators import log_operation
from apps.authorization.roles import resolve_current_role
from apps.users.models import User
from core.exceptions import BusinessError, ErrorCodes

from .constants import (
    CONFIG_MODULE_PERMISSION_CODES,
    EFFECT_ALLOW,
    EFFECT_DENY,
    PERMISSION_CATALOG,
    PERMISSION_SCOPE_GROUP_KEY_MAP,
    REGISTERED_PERMISSION_CODES,
    SCOPE_ALL,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_GROUP_RULES,
    SYSTEM_MANAGED_PERMISSION_CODES,
)
from .models import Permission, UserPermissionOverride
from .permission_implications import get_permission_covering_codes, permission_code_set_covers


class UserOverrideServiceMixin:
    @staticmethod
    def _get_scope_group_key(permission_code: str) -> Optional[str]:
        return PERMISSION_SCOPE_GROUP_KEY_MAP.get(permission_code)

    def _resolve_role(self, role_code: Optional[str] = None) -> Optional[str]:
        return role_code or resolve_current_role(self.user)

    def _resolve_override_effect(
        self,
        *,
        acting_user: Optional[User],
        permission_code: str,
        current_role: Optional[str],
    ) -> Optional[str]:
        if permission_code in SYSTEM_MANAGED_PERMISSION_CODES:
            return None
        if permission_code in CONFIG_MODULE_PERMISSION_CODES:
            return None
        if not acting_user or acting_user.is_superuser:
            return None

        overrides = self._list_active_user_overrides_cached(
            user_id=acting_user.id,
            current_role=current_role,
            permission_code=permission_code,
        )

        allow_matched = False
        for override in overrides:
            if override.effect == EFFECT_DENY:
                return EFFECT_DENY
            if override.effect == EFFECT_ALLOW:
                allow_matched = True

        if allow_matched:
            return EFFECT_ALLOW
        return None

    def _get_scope_group_scope_types(
        self,
        *,
        scope_group_key: str,
        current_role: Optional[str] = None,
    ) -> List[str]:
        resolved_role = self._resolve_role(current_role)
        if not resolved_role:
            return []

        return [
            rule['scope_type']
            for rule in SCOPE_GROUP_RULES
            if rule['scope_group_key'] == scope_group_key and rule['role_code'] == resolved_role
        ]

    def _get_scope_group_effective_scope_types(
        self,
        *,
        scope_group_key: str,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> set[str]:
        """返回角色绑定的范围类型（无用户级覆盖）。"""
        base_user = acting_user or self.user
        if not base_user or not base_user.is_authenticated:
            return set()
        if base_user.is_superuser:
            return {SCOPE_ALL}

        resolved_role = self._resolve_role(current_role)
        if not resolved_role:
            return set()

        return set(
            self._get_scope_group_scope_types(
                scope_group_key=scope_group_key,
                current_role=resolved_role,
            )
        )

    def _is_scope_capability_granted(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> bool:
        base_user = acting_user or self.user
        if not base_user or not base_user.is_authenticated:
            return False
        if base_user.is_superuser:
            return True

        resolved_role = self._resolve_role(current_role)
        if not resolved_role:
            return False
        if not self._is_permission_granted(
            permission_code,
            acting_user=base_user,
            current_role=resolved_role,
        ):
            return False

        scope_group_key = self._get_scope_group_key(permission_code)
        if not scope_group_key:
            return True

        return bool(
            self._get_scope_group_effective_scope_types(
                scope_group_key=scope_group_key,
                acting_user=base_user,
                current_role=resolved_role,
            )
        )

    def is_capability_granted(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> bool:
        if permission_code in SCOPE_AWARE_PERMISSION_CODES:
            return self._is_scope_capability_granted(
                permission_code,
                acting_user=acting_user,
                current_role=current_role,
            )
        return self._is_permission_granted(
            permission_code,
            acting_user=acting_user,
            current_role=current_role,
        )

    def has_allow_override(
        self,
        permission_code: str,
        *,
        current_role: Optional[str] = None,
    ) -> bool:
        resolved_role = self._resolve_role(current_role)
        return (
            self._resolve_override_effect(
                acting_user=self.user,
                permission_code=permission_code,
                current_role=resolved_role,
            )
            == EFFECT_ALLOW
        )

    def _is_permission_granted(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> bool:
        base_user = acting_user or self.user
        if not base_user or not base_user.is_authenticated:
            return False
        if base_user.is_superuser:
            return True

        resolved_role = self._resolve_role(current_role)
        override_effect = self._resolve_override_effect(
            acting_user=base_user,
            permission_code=permission_code,
            current_role=resolved_role,
        )

        if override_effect == EFFECT_DENY:
            return False
        if override_effect == EFFECT_ALLOW:
            return True
        if not resolved_role:
            return False

        implied_allow_codes = get_permission_covering_codes(permission_code)
        for implied_allow_code in implied_allow_codes:
            if self._resolve_override_effect(
                acting_user=base_user,
                permission_code=implied_allow_code,
                current_role=resolved_role,
            ) == EFFECT_ALLOW:
                return True

        role_codes = self._get_role_permission_code_set(resolved_role)
        return permission_code_set_covers(role_codes, permission_code)

    def get_permission_scope_types(
        self,
        *,
        permission_code: str,
        current_role: Optional[str] = None,
    ) -> List[str]:
        resolved_role = self._resolve_role(current_role)
        if not resolved_role:
            return []

        scope_group_key = self._get_scope_group_key(permission_code)
        if scope_group_key:
            return self._get_scope_group_scope_types(
                scope_group_key=scope_group_key,
                current_role=resolved_role,
            )
        if permission_code in SCOPE_AWARE_PERMISSION_CODES:
            return []
        return [SCOPE_ALL]

    def get_capability_map(
        self,
        *,
        current_role: Optional[str] = None,
        user: Optional[User] = None,
    ) -> dict[str, dict]:
        resolved_role = current_role or self._resolve_role()
        capability_codes = {item['code'] for item in PERMISSION_CATALOG}
        capability_codes.update(SYSTEM_MANAGED_PERMISSION_CODES)

        capability_map: dict[str, dict] = {}
        for permission_code in sorted(capability_codes):
            allowed = self.is_capability_granted(
                permission_code,
                acting_user=user,
                current_role=resolved_role,
            ) if resolved_role else False
            capability_map[permission_code] = {
                'allowed': allowed,
            }
        return capability_map

    def list_user_permission_overrides(
        self,
        *,
        user_id: int,
    ) -> List[UserPermissionOverride]:
        queryset = UserPermissionOverride.objects.select_related('permission', 'granted_by').filter(user_id=user_id)
        overrides = list(queryset.order_by('-created_at', '-id'))
        return [
            override
            for override in overrides
            if (
                override.permission.code in REGISTERED_PERMISSION_CODES
                and override.permission.code not in CONFIG_MODULE_PERMISSION_CODES
            )
        ]

    @transaction.atomic
    @log_operation(
        'authorization',
        'create_user_permission_override',
        '权限：{permission_code}；效果：{effect_label}',
        target_type='user',
        target_title_template='{result.user.username}',
        group='用户授权',
        label='新增用户权限覆盖',
    )
    def create_user_permission_override(
        self,
        *,
        user_id: int,
        permission_code: str,
        effect: str,
        applies_to_role: Optional[str],
    ) -> UserPermissionOverride:
        target_user = self.validate_not_none(
            User.objects.filter(pk=user_id).first(),
            f'用户 {user_id} 不存在',
        )
        if target_user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管账号为专有角色，不支持配置用户权限覆盖',
            )
        if permission_code not in REGISTERED_PERMISSION_CODES:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'权限 {permission_code} 已移除或未注册，不支持配置用户权限覆盖',
            )
        permission = self.validate_not_none(
            Permission.objects.filter(code=permission_code, is_active=True).first(),
            f'权限 {permission_code} 不存在',
        )
        if permission.code in SYSTEM_MANAGED_PERMISSION_CODES:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'权限 {permission.code} 属于系统保留权限，不支持手动覆盖',
            )
        if permission.code in CONFIG_MODULE_PERMISSION_CODES:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='配置管理模块不在用户授权范围内，请通过超管入口配置',
            )

        normalized_applies_to_role = applies_to_role or ''
        if normalized_applies_to_role == 'STUDENT':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='学员角色为固定工作台角色，不支持配置用户权限覆盖',
            )

        override, _ = UserPermissionOverride.objects.update_or_create(
            user=target_user,
            permission=permission,
            applies_to_role=normalized_applies_to_role,
            defaults={
                'effect': effect,
                'granted_by': self.user,
            },
        )
        return override

    @transaction.atomic
    @log_operation(
        'authorization',
        'delete_user_permission_override',
        '权限：{result.permission.code}',
        target_type='user',
        target_title_template='{result.user.username}',
        group='用户授权',
        label='删除用户权限覆盖',
    )
    def delete_user_permission_override(
        self,
        *,
        user_id: int,
        override_id: int,
    ) -> UserPermissionOverride:
        override = self.validate_not_none(
            UserPermissionOverride.objects.select_related('permission', 'user').filter(
                id=override_id,
                user_id=user_id,
            ).first(),
            '权限覆盖规则不存在',
        )
        UserPermissionOverride.objects.filter(pk=override.pk).delete()
        return override
