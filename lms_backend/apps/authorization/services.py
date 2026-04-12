"""Authorization services."""

from typing import Iterable, List, Optional, Set

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes
from apps.authorization.roles import SUPER_ADMIN_ROLE
from apps.users.models import Role, User

from .constants import (
    CONFIG_MODULE_PERMISSION_CODES,
    CONFIG_PERMISSION_MANAGEABLE_ROLE,
    CONDITIONAL_PERMISSION_CODES,
    EFFECT_ALLOW,
    EFFECT_DENY,
    PERMISSION_CATALOG,
    PERMISSION_IMPLIES_MAP,
    PERMISSION_SCOPE_GROUP_KEY_MAP,
    PERMISSION_SCOPE_GROUPS,
    PERMISSION_SCOPE_RULES,
    REGISTERED_PERMISSION_CODES,
    ROLE_PERMISSION_DEFAULTS,
    ROLE_SYSTEM_PERMISSION_DEFAULTS,
    SCOPE_ALL,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_DESCRIPTIONS,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_GROUP_RULES,
    SCOPE_MENTEES,
    SCOPE_SELF,
    SYSTEM_MANAGED_PERMISSION_CODES,
    VISIBLE_SCOPE_CHOICES,
)
from .models import (
    Permission,
    PermissionScopeRule,
    RolePermission,
    UserPermissionOverride,
    UserScopeGroupOverride,
)
from .selectors import (
    get_permissions_by_codes,
    list_active_scope_group_overrides,
    list_active_user_overrides,
    list_permissions,
)

class AuthorizationService(BaseService):
    """Unified authorization service."""

    REQUEST_CACHE_ATTR = '_authorization_service_cache'

    def _get_request_cache(self) -> dict[str, dict]:
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is None:
            cache = {
                'user_overrides': {},
                'scope_group_overrides': {},
            }
            setattr(self.request, self.REQUEST_CACHE_ATTR, cache)
        return cache

    def _list_active_user_overrides_cached(
        self,
        *,
        user_id: int,
        current_role: Optional[str],
        permission_code: Optional[str] = None,
    ):
        cache_key = (user_id, current_role or '', permission_code or '')
        cache = self._get_request_cache()['user_overrides']
        if cache_key not in cache:
            cache[cache_key] = list_active_user_overrides(
                user_id=user_id,
                current_role=current_role,
                permission_code=permission_code,
            )
        return cache[cache_key]

    def _list_active_scope_group_overrides_cached(
        self,
        *,
        user_id: int,
        current_role: Optional[str],
        scope_group_key: Optional[str] = None,
    ):
        cache_key = (user_id, current_role or '', scope_group_key or '')
        cache = self._get_request_cache()['scope_group_overrides']
        if cache_key not in cache:
            cache[cache_key] = list_active_scope_group_overrides(
                user_id=user_id,
                current_role=current_role,
                scope_group_key=scope_group_key,
            )
        return cache[cache_key]

    @staticmethod
    def _supports_scope_override(permission_code: str) -> bool:
        return permission_code in SCOPE_AWARE_PERMISSION_CODES

    @staticmethod
    def _get_scope_group_key(permission_code: str) -> Optional[str]:
        return PERMISSION_SCOPE_GROUP_KEY_MAP.get(permission_code)

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
        actor: Optional[User],
        target_user: Optional[User],
    ) -> bool:
        scope_type = override.scope_type

        if scope_type == SCOPE_ALL:
            return True

        if not actor:
            return False

        if target_user is None:
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

        if not acting_user:
            return None
        if acting_user.is_superuser:
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
        """Evaluate permission with deny > allow > role baseline."""
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

    def list_permission_catalog(
        self,
        module: Optional[str] = None,
        catalog_view: Optional[str] = None,
    ) -> List[Permission]:
        return list_permissions(module=module, catalog_view=catalog_view)

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

    @transaction.atomic
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
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            )
        overrides = list(queryset.order_by('-created_at', '-id'))
        return [override for override in overrides if override.scope_group_key in PERMISSION_SCOPE_GROUPS]

    @transaction.atomic
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
    def sync_permission_catalog() -> None:
        """Sync code-defined permissions into DB and prune removed permissions."""
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
        """Sync code-defined scope rules into DB and prune removed rules."""
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

        stale_rules = PermissionScopeRule.objects.filter(
            permission__code__in=managed_permission_codes,
        )
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
        """
        Sync code-defined authorization defaults.

        Normal syncs only manage the permission catalog. Role templates are
        computed from code defaults plus DB overrides.
        """
        AuthorizationService.sync_permission_catalog()
        AuthorizationService.sync_permission_scope_rules()
        if sync_role_templates:
            if overwrite_existing_role_templates:
                RolePermission.objects.filter(role__code__in=ROLE_PERMISSION_DEFAULTS.keys()).delete()
