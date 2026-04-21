from typing import Iterable, List, Optional

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.activity_logs.decorators import log_operation
from apps.authorization.roles import resolve_current_role
from apps.users.models import User
from core.exceptions import BusinessError, ErrorCodes

from .constants import (
    CONDITIONAL_PERMISSION_CODES,
    CONFIG_MODULE_PERMISSION_CODES,
    EFFECT_ALLOW,
    EFFECT_DENY,
    PERMISSION_CATALOG,
    PERMISSION_SCOPE_GROUP_KEY_MAP,
    PERMISSION_SCOPE_GROUPS,
    REGISTERED_PERMISSION_CODES,
    SCOPE_ALL,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_GROUP_RULES,
    SCOPE_MENTEES,
    SCOPE_SELF,
    SYSTEM_MANAGED_PERMISSION_CODES,
)
from .models import Permission, UserPermissionOverride, UserScopeGroupOverride


class UserOverrideServiceMixin:
    @staticmethod
    def _supports_scope_override(permission_code: str) -> bool:
        return permission_code in SCOPE_AWARE_PERMISSION_CODES

    @staticmethod
    def _get_scope_group_key(permission_code: str) -> Optional[str]:
        return PERMISSION_SCOPE_GROUP_KEY_MAP.get(permission_code)

    def _resolve_role(self, role_code: Optional[str] = None) -> Optional[str]:
        return role_code or resolve_current_role(self.user)

    def _resolve_target_user(
        self,
        *,
        target_user: Optional[User] = None,
        target_user_id: Optional[int] = None,
    ) -> Optional[User]:
        if target_user is not None:
            return target_user
        if target_user_id is None:
            return None
        return User.objects.select_related('department', 'mentor').filter(pk=target_user_id).first()

    def _match_scope(
        self,
        override: UserPermissionOverride,
        *,
        actor: Optional[User],
        target_user: Optional[User],
    ) -> bool:
        scope_type = override.scope_type

        if scope_type == SCOPE_ALL:
            return True
        if not actor or target_user is None:
            return False

        target_user_id = target_user.id
        if scope_type == SCOPE_SELF:
            return target_user_id == actor.id
        if scope_type == SCOPE_MENTEES:
            return target_user.mentor_id == actor.id
        if scope_type == SCOPE_DEPARTMENT:
            if not actor.department_id:
                return False
            return target_user.department_id == actor.department_id
        if scope_type == SCOPE_EXPLICIT_USERS:
            return target_user_id in set(override.scope_user_ids or [])
        return False

    def _resolve_override_effect(
        self,
        *,
        acting_user: Optional[User],
        permission_code: str,
        current_role: Optional[str],
        target_user: Optional[User],
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
            if not self._match_scope(override, actor=acting_user, target_user=target_user):
                continue
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

    def _get_scope_group_effective_scope_state(
        self,
        *,
        scope_group_key: str,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> tuple[set[str], set[int]]:
        base_user = acting_user or self.user
        if not base_user or not base_user.is_authenticated:
            return set(), set()
        if base_user.is_superuser:
            return {SCOPE_ALL}, set()

        resolved_role = self._resolve_role(current_role)
        if not resolved_role:
            return set(), set()

        broad_allowed_scopes = set(
            self._get_scope_group_scope_types(
                scope_group_key=scope_group_key,
                current_role=resolved_role,
            )
        )
        explicit_allowed_user_ids: set[int] = set()

        overrides = self._list_active_scope_group_overrides_cached(
            user_id=base_user.id,
            current_role=resolved_role,
            scope_group_key=scope_group_key,
        )
        for override in overrides:
            if override.effect == EFFECT_DENY:
                if override.scope_type == SCOPE_ALL:
                    return set(), set()
                if override.scope_type == SCOPE_EXPLICIT_USERS:
                    explicit_allowed_user_ids -= set(override.scope_user_ids or [])
                else:
                    broad_allowed_scopes.discard(override.scope_type)
                continue

            if override.scope_type == SCOPE_EXPLICIT_USERS:
                explicit_allowed_user_ids |= set(override.scope_user_ids or [])
            else:
                broad_allowed_scopes.add(override.scope_type)

        return broad_allowed_scopes, explicit_allowed_user_ids

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

        broad_allowed_scopes, explicit_allowed_user_ids = self._get_scope_group_effective_scope_state(
            scope_group_key=scope_group_key,
            acting_user=base_user,
            current_role=resolved_role,
        )
        return bool(broad_allowed_scopes or explicit_allowed_user_ids)

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
        target_user: Optional[User] = None,
        target_user_id: Optional[int] = None,
    ) -> bool:
        resolved_role = self._resolve_role(current_role)
        resolved_target = self._resolve_target_user(target_user=target_user, target_user_id=target_user_id)
        return (
            self._resolve_override_effect(
                acting_user=self.user,
                permission_code=permission_code,
                current_role=resolved_role,
                target_user=resolved_target,
            )
            == EFFECT_ALLOW
        )

    def _is_permission_granted(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
        target_user: Optional[User] = None,
        target_user_id: Optional[int] = None,
    ) -> bool:
        base_user = acting_user or self.user
        if not base_user or not base_user.is_authenticated:
            return False
        if base_user.is_superuser:
            return True

        resolved_role = self._resolve_role(current_role)
        resolved_target = self._resolve_target_user(target_user=target_user, target_user_id=target_user_id)
        override_effect = self._resolve_override_effect(
            acting_user=base_user,
            permission_code=permission_code,
            current_role=resolved_role,
            target_user=resolved_target,
        )

        if override_effect == EFFECT_DENY:
            return False
        if override_effect == EFFECT_ALLOW:
            return True
        if not resolved_role:
            return False

        role_codes = self._get_role_permission_code_set(resolved_role)
        return permission_code in role_codes

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
            scope_types = self.get_permission_scope_types(
                permission_code=permission_code,
                current_role=resolved_role,
            ) if resolved_role else []
            capability_map[permission_code] = {
                'allowed': allowed,
                'conditional': permission_code in CONDITIONAL_PERMISSION_CODES,
                'scope_types': scope_types,
            }
        return capability_map

    def list_user_permission_overrides(
        self,
        *,
        user_id: int,
        include_inactive: bool = False,
    ) -> List[UserPermissionOverride]:
        queryset = UserPermissionOverride.objects.select_related('permission', 'granted_by', 'revoked_by').filter(user_id=user_id)
        if not include_inactive:
            queryset = queryset.filter(
                is_active=True,
                revoked_at__isnull=True,
            ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
        overrides = list(queryset.order_by('-created_at', '-id'))
        return [
            override
            for override in overrides
            if (
                override.permission.code in REGISTERED_PERMISSION_CODES
                and override.permission.code not in CONFIG_MODULE_PERMISSION_CODES
                and not (
                    override.permission.code in SCOPE_AWARE_PERMISSION_CODES
                    and override.scope_type != SCOPE_ALL
                )
            )
        ]

    @transaction.atomic
    @log_operation(
        'authorization',
        'create_user_permission_override',
        '权限：{permission_code}；效果：{effect_label}；范围：{scope_type_label}',
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
        scope_type: str,
        scope_user_ids: Optional[List[int]] = None,
        reason: str = '',
        expires_at=None,
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

        normalized_applies_to_role = applies_to_role or None
        if normalized_applies_to_role == 'STUDENT':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='学员角色为固定工作台角色，不支持配置用户权限覆盖',
            )

        normalized_scope_type = scope_type
        normalized_scope_user_ids = sorted({int(item) for item in (scope_user_ids or [])})
        if permission.code in SCOPE_AWARE_PERMISSION_CODES and (
            normalized_scope_type != SCOPE_ALL or normalized_scope_user_ids
        ):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='范围感知权限不再支持通过旧权限覆盖接口配置对象范围，请改用范围组覆盖接口',
            )
        if not self._supports_scope_override(permission.code):
            normalized_scope_type = SCOPE_ALL
            normalized_scope_user_ids = []

        if normalized_scope_type == SCOPE_EXPLICIT_USERS:
            if not normalized_scope_user_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='指定用户范围必须至少选择一个用户',
                )
            valid_scope_user_ids = set(
                User.objects.filter(
                    id__in=normalized_scope_user_ids,
                    is_active=True,
                ).values_list('id', flat=True)
            )
            invalid_scope_user_ids = sorted(set(normalized_scope_user_ids) - valid_scope_user_ids)
            if invalid_scope_user_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'指定用户不存在或已停用: {invalid_scope_user_ids}',
                )
        elif normalized_scope_user_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='仅当范围为指定用户时才允许传 scope_user_ids',
            )

        return UserPermissionOverride.objects.create(
            user=target_user,
            permission=permission,
            effect=effect,
            applies_to_role=normalized_applies_to_role,
            scope_type=normalized_scope_type,
            scope_user_ids=normalized_scope_user_ids,
            reason=reason,
            expires_at=expires_at,
            granted_by=self.user,
        )

    def list_user_scope_group_overrides(
        self,
        *,
        user_id: int,
        include_inactive: bool = False,
    ) -> List[UserScopeGroupOverride]:
        queryset = UserScopeGroupOverride.objects.select_related('granted_by', 'revoked_by').filter(user_id=user_id)
        if not include_inactive:
            queryset = queryset.filter(
                is_active=True,
                revoked_at__isnull=True,
            ).filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
        overrides = list(queryset.order_by('-created_at', '-id'))
        return [
            override
            for override in overrides
            if (
                override.scope_group_key in PERMISSION_SCOPE_GROUPS
                and override.scope_type in PERMISSION_SCOPE_GROUPS[override.scope_group_key]['available_scope_types']
            )
        ]

    @transaction.atomic
    @log_operation(
        'authorization',
        'create_user_scope_group_override',
        '范围组：{scope_group_key}；效果：{effect_label}；范围：{scope_type_label}',
        target_type='user',
        target_title_template='{result.user.username}',
        group='用户授权',
        label='新增用户范围组覆盖',
    )
    def create_user_scope_group_override(
        self,
        *,
        user_id: int,
        scope_group_key: str,
        effect: str,
        applies_to_role: Optional[str],
        scope_type: str,
        scope_user_ids: Optional[List[int]] = None,
        reason: str = '',
        expires_at=None,
    ) -> UserScopeGroupOverride:
        target_user = self.validate_not_none(
            User.objects.filter(pk=user_id).first(),
            f'用户 {user_id} 不存在',
        )
        if target_user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管账号为专有角色，不支持配置范围组覆盖',
            )
        if scope_group_key not in PERMISSION_SCOPE_GROUPS:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'范围组 {scope_group_key} 不存在',
            )
        available_scope_types = set(PERMISSION_SCOPE_GROUPS[scope_group_key]['available_scope_types'])
        if scope_type not in available_scope_types:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'范围组 {scope_group_key} 不支持 {scope_type} 范围',
            )

        normalized_applies_to_role = applies_to_role or None
        if normalized_applies_to_role == 'STUDENT':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='学员角色为固定工作台角色，不支持配置范围组覆盖',
            )

        normalized_scope_user_ids = sorted({int(item) for item in (scope_user_ids or [])})
        if scope_type == SCOPE_EXPLICIT_USERS:
            if not normalized_scope_user_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='指定用户范围必须至少选择一个用户',
                )
            valid_scope_user_ids = set(
                User.objects.filter(id__in=normalized_scope_user_ids, is_active=True).values_list('id', flat=True)
            )
            invalid_scope_user_ids = sorted(set(normalized_scope_user_ids) - valid_scope_user_ids)
            if invalid_scope_user_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'指定用户不存在或已停用: {invalid_scope_user_ids}',
                )
        elif normalized_scope_user_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='仅当范围为指定用户时才允许传 scope_user_ids',
            )

        return UserScopeGroupOverride.objects.create(
            user=target_user,
            scope_group_key=scope_group_key,
            effect=effect,
            applies_to_role=normalized_applies_to_role,
            scope_type=scope_type,
            scope_user_ids=normalized_scope_user_ids,
            reason=reason,
            expires_at=expires_at,
            granted_by=self.user,
        )

    @transaction.atomic
    @log_operation(
        'authorization',
        'revoke_user_scope_group_override',
        '范围组：{result.scope_group_key}',
        target_type='user',
        target_title_template='{result.user.username}',
        group='用户授权',
        label='撤销用户范围组覆盖',
    )
    def revoke_user_scope_group_override(
        self,
        *,
        user_id: int,
        override_id: int,
        revoke_reason: str = '',
    ) -> UserScopeGroupOverride:
        override = self.validate_not_none(
            UserScopeGroupOverride.objects.filter(id=override_id, user_id=user_id).first(),
            '范围组覆盖规则不存在',
        )
        override.is_active = False
        override.revoked_at = timezone.now()
        override.revoked_by = self.user
        override.revoked_reason = revoke_reason
        override.save(update_fields=['is_active', 'revoked_at', 'revoked_by', 'revoked_reason', 'updated_at'])
        return override

    @transaction.atomic
    @log_operation(
        'authorization',
        'revoke_user_permission_override',
        '权限：{result.permission.code}',
        target_type='user',
        target_title_template='{result.user.username}',
        group='用户授权',
        label='撤销用户权限覆盖',
    )
    def revoke_user_permission_override(
        self,
        *,
        user_id: int,
        override_id: int,
        revoke_reason: str = '',
    ) -> UserPermissionOverride:
        override = self.validate_not_none(
            UserPermissionOverride.objects.select_related('permission').filter(
                id=override_id,
                user_id=user_id,
            ).first(),
            '权限覆盖规则不存在',
        )
        override.is_active = False
        override.revoked_at = timezone.now()
        override.revoked_by = self.user
        override.revoked_reason = revoke_reason
        override.save(update_fields=['is_active', 'revoked_at', 'revoked_by', 'revoked_reason', 'updated_at'])
        return override
