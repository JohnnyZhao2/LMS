"""Authorization services."""

from typing import Iterable, List, Optional, Set

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from apps.users.models import Role, User
from apps.users.permissions import SUPER_ADMIN_ROLE

from .constants import (
    CONFIG_MODULE_PERMISSION_CODES,
    CONFIG_PERMISSION_MANAGEABLE_ROLE,
    EFFECT_ALLOW,
    EFFECT_DENY,
    PERMISSION_CATALOG,
    ROLE_DEFAULT_SCOPE_TYPES,
    ROLE_PERMISSION_DEFAULTS,
    ROLE_SYSTEM_PERMISSION_DEFAULTS,
    SCOPE_ALL,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_DESCRIPTIONS,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_MENTEES,
    SCOPE_SELF,
    SYSTEM_MANAGED_PERMISSION_CODES,
    VISIBLE_SCOPE_CHOICES,
)
from .models import Permission, RolePermission, UserPermissionOverride
from .selectors import (
    get_permissions_by_codes,
    list_active_user_overrides,
    list_permissions,
    list_role_permission_codes,
)


class AuthorizationService(BaseService):
    """Unified authorization service."""

    @staticmethod
    def _supports_scope_override(permission_code: str) -> bool:
        return permission_code in SCOPE_AWARE_PERMISSION_CODES

    @staticmethod
    def _can_manage_config_permissions(role_code: Optional[str]) -> bool:
        return role_code == CONFIG_PERMISSION_MANAGEABLE_ROLE

    @classmethod
    def _is_config_permission_locked_for_role(
        cls,
        permission_code: str,
        role_code: Optional[str],
    ) -> bool:
        return (
            permission_code in CONFIG_MODULE_PERMISSION_CODES
            and not cls._can_manage_config_permissions(role_code)
        )

    @staticmethod
    def _get_system_role_permission_code_set(role_code: str) -> Set[str]:
        return set(ROLE_SYSTEM_PERMISSION_DEFAULTS.get(role_code, []))

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

    @staticmethod
    def _get_role_permission_code_set(role_code: str) -> Set[str]:
        role_codes = set(list_role_permission_codes(role_code))
        if not role_codes:
            role_codes = set(ROLE_PERMISSION_DEFAULTS.get(role_code, []))
        return AuthorizationService._normalize_role_permission_codes(role_code, role_codes)

    def _resolve_role(self, role_code: Optional[str] = None) -> Optional[str]:
        return role_code or self.get_current_role()

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
        target_user: Optional[User],
    ) -> bool:
        scope_type = override.scope_type

        if scope_type == SCOPE_ALL:
            return True

        if not self.user:
            return False

        if target_user is None:
            return False

        target_user_id = target_user.id

        if scope_type == SCOPE_SELF:
            return target_user_id == self.user.id

        if scope_type == SCOPE_MENTEES:
            return target_user.mentor_id == self.user.id

        if scope_type == SCOPE_DEPARTMENT:
            if not self.user.department_id:
                return False
            return target_user.department_id == self.user.department_id

        if scope_type == SCOPE_EXPLICIT_USERS:
            return target_user_id in set(override.scope_user_ids or [])

        return False

    def _resolve_override_effect(
        self,
        *,
        permission_code: str,
        current_role: Optional[str],
        target_user: Optional[User],
    ) -> Optional[str]:
        if permission_code in SYSTEM_MANAGED_PERMISSION_CODES:
            return None
        if self._is_config_permission_locked_for_role(permission_code, current_role):
            return None

        if not self.user:
            return None

        overrides = list_active_user_overrides(
            user_id=self.user.id,
            current_role=current_role,
            permission_code=permission_code,
        )

        allow_matched = False
        for override in overrides:
            if not self._match_scope(override, target_user=target_user):
                continue
            if override.effect == EFFECT_DENY:
                return EFFECT_DENY
            if override.effect == EFFECT_ALLOW:
                allow_matched = True

        if allow_matched:
            return EFFECT_ALLOW
        return None

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
                permission_code=permission_code,
                current_role=resolved_role,
                target_user=resolved_target,
            )
            == EFFECT_ALLOW
        )

    def has_deny_override(
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
                permission_code=permission_code,
                current_role=resolved_role,
                target_user=resolved_target,
            )
            == EFFECT_DENY
        )

    def can(
        self,
        permission_code: str,
        *,
        current_role: Optional[str] = None,
        target_user: Optional[User] = None,
        target_user_id: Optional[int] = None,
    ) -> bool:
        """Evaluate permission with deny > allow > role baseline."""
        if not self.user or not self.user.is_authenticated:
            return False
        if self.user.is_superuser:
            return True

        resolved_role = self._resolve_role(current_role)
        resolved_target = self._resolve_target_user(target_user=target_user, target_user_id=target_user_id)
        override_effect = self._resolve_override_effect(
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

    def enforce(
        self,
        permission_code: str,
        *,
        error_message: Optional[str] = None,
        current_role: Optional[str] = None,
        target_user: Optional[User] = None,
        target_user_id: Optional[int] = None,
    ) -> None:
        if self.can(
            permission_code,
            current_role=current_role,
            target_user=target_user,
            target_user_id=target_user_id,
        ):
            return
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=error_message or f'缺少权限: {permission_code}',
        )

    def get_effective_permission_codes(
        self,
        *,
        current_role: Optional[str] = None,
        user: Optional[User] = None,
    ) -> List[str]:
        """
        Return current effective global permission codes for frontend guards.

        Note: only global (scope=ALL) overrides are folded into this list.
        """
        base_user = user or self.user
        if not base_user or not base_user.is_authenticated:
            return []
        if base_user.is_superuser:
            all_codes = set(
                Permission.objects.filter(is_active=True).values_list('code', flat=True)
            )
            all_codes.update(SYSTEM_MANAGED_PERMISSION_CODES)
            return sorted(all_codes)

        resolved_role = current_role or self._resolve_role()
        if not resolved_role:
            return []

        role_permissions: Set[str] = self._get_role_permission_code_set(resolved_role)

        global_overrides = list_active_user_overrides(
            user_id=base_user.id,
            current_role=resolved_role,
        )

        for override in global_overrides:
            if override.scope_type != SCOPE_ALL:
                continue
            code = override.permission.code
            if code in SYSTEM_MANAGED_PERMISSION_CODES:
                continue
            if override.effect == EFFECT_DENY:
                role_permissions.discard(code)
                continue
            if override.effect == EFFECT_ALLOW:
                role_permissions.add(code)

        return sorted(role_permissions)

    def list_permission_catalog(self, module: Optional[str] = None) -> List[Permission]:
        return list_permissions(module=module)

    def get_role_permission_codes(self, role_code: str) -> List[str]:
        if role_code == SUPER_ADMIN_ROLE:
            all_codes = set(Permission.objects.filter(is_active=True).values_list('code', flat=True))
            all_codes.update(SYSTEM_MANAGED_PERMISSION_CODES)
            return sorted(all_codes)
        return sorted(self._get_role_permission_code_set(role_code))

    def get_role_default_scope_types(self, role_code: str) -> List[str]:
        if role_code == SUPER_ADMIN_ROLE:
            return [SCOPE_ALL]
        return list(ROLE_DEFAULT_SCOPE_TYPES.get(role_code, [SCOPE_ALL]))

    def get_role_scope_options(self, role_code: str) -> List[dict]:
        default_scope_types = set(self.get_role_default_scope_types(role_code))
        return [
            {
                'code': scope_code,
                'label': scope_label,
                'description': SCOPE_DESCRIPTIONS.get(scope_code, ''),
                'inherited_by_default': scope_code in default_scope_types,
            }
            for scope_code, scope_label in VISIBLE_SCOPE_CHOICES
        ]

    @transaction.atomic
    def replace_role_permissions(self, role_code: str, permission_codes: Iterable[str]) -> List[str]:
        if role_code == SUPER_ADMIN_ROLE:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管为系统专有角色，不支持配置模板权限',
            )
        requested_codes = [code for code in permission_codes if code]
        if not self._can_manage_config_permissions(role_code):
            forbidden_codes = sorted(set(requested_codes) & set(CONFIG_MODULE_PERMISSION_CODES))
            if forbidden_codes:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'配置管理权限仅支持管理员角色，非法权限: {forbidden_codes}',
                )
        role = self.validate_not_none(
            Role.objects.filter(code=role_code).first(),
            f'角色 {role_code} 不存在',
        )

        normalized_codes = sorted(self._normalize_role_permission_codes(role_code, requested_codes))
        permission_objects = get_permissions_by_codes(normalized_codes)
        resolved_codes = {item.code for item in permission_objects}
        missing_codes = sorted(set(normalized_codes) - resolved_codes)
        if missing_codes:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'存在无效权限编码: {missing_codes}',
            )

        RolePermission.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create(
            [
                RolePermission(role=role, permission=permission)
                for permission in permission_objects
            ],
            batch_size=500,
        )

        return sorted(resolved_codes)

    def list_user_permission_overrides(
        self,
        *,
        user_id: int,
        include_inactive: bool = False,
    ) -> List[UserPermissionOverride]:
        queryset = UserPermissionOverride.objects.select_related('permission', 'granted_by', 'revoked_by').filter(
            user_id=user_id,
        )
        if not include_inactive:
            queryset = queryset.filter(
                is_active=True,
                revoked_at__isnull=True,
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            )
        overrides = list(queryset.order_by('-created_at', '-id'))
        return [
            override
            for override in overrides
            if not self._is_config_permission_locked_for_role(
                override.permission.code,
                override.applies_to_role or None,
            )
        ]

    @transaction.atomic
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
        permission = self.validate_not_none(
            Permission.objects.filter(code=permission_code, is_active=True).first(),
            f'权限 {permission_code} 不存在',
        )
        if permission.code in SYSTEM_MANAGED_PERMISSION_CODES:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'权限 {permission.code} 属于系统保留权限，不支持手动覆盖',
            )

        normalized_applies_to_role = applies_to_role or None
        if normalized_applies_to_role == 'STUDENT':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='学员角色为固定工作台角色，不支持配置用户权限覆盖',
            )
        if self._is_config_permission_locked_for_role(permission.code, normalized_applies_to_role):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='配置管理权限仅支持管理员角色下配置',
            )

        normalized_scope_type = scope_type
        normalized_scope_user_ids = sorted({int(item) for item in (scope_user_ids or [])})
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

        override = UserPermissionOverride.objects.create(
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
        return override

    @transaction.atomic
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

    @staticmethod
    @transaction.atomic
    def ensure_defaults() -> None:
        """Idempotently seed permission catalog and role baseline."""
        permissions_by_code = {}
        for item in PERMISSION_CATALOG:
            permission, _ = Permission.objects.update_or_create(
                code=item['code'],
                defaults={
                    'name': item['name'],
                    'module': item['module'],
                    'description': item['description'],
                    'is_active': True,
                },
            )
            permissions_by_code[item['code']] = permission

        Permission.objects.exclude(code__in=permissions_by_code.keys()).delete()

        for role_code, permission_codes in ROLE_PERMISSION_DEFAULTS.items():
            role = Role.objects.filter(code=role_code).first()
            if not role:
                continue
            RolePermission.objects.filter(role=role).delete()
            RolePermission.objects.bulk_create(
                [
                    RolePermission(role=role, permission=permissions_by_code[permission_code])
                    for permission_code in permission_codes
                    if permission_code in permissions_by_code
                ],
                batch_size=500,
            )
