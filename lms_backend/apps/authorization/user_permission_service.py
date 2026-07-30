from typing import Optional

from django.db import transaction

from apps.activity_logs.registry import register_operation_log_action
from apps.authorization.roles import AUTH_ROLE_CODES, resolve_current_role
from apps.users.models import User
from core.audit import audit_operation
from core.exceptions import BusinessError, ErrorCodes

from .constants import (
    PERMISSION_CATALOG,
    REGISTERED_PERMISSION_CODES,
    SYSTEM_MANAGED_PERMISSION_CODES,
)
from .models import Permission, UserPermission
from .scoped_queryset import filter_users_by_management_role


register_operation_log_action(
    'authorization',
    'grant_user_permission',
    group='用户授权',
    label='授予用户权限',
)
register_operation_log_action(
    'authorization',
    'revoke_user_permission',
    group='用户授权',
    label='撤销用户权限',
)


class UserPermissionServiceMixin:
    REQUEST_CACHE_ATTR = '_authorization_permission_codes'

    def _permission_codes_for(self, user: User) -> set[str]:
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is None:
            cache = {}
            setattr(self.request, self.REQUEST_CACHE_ATTR, cache)
        if user.id not in cache:
            cache[user.id] = set(
                UserPermission.objects.filter(
                    user=user,
                    permission__is_active=True,
                    permission__code__in=REGISTERED_PERMISSION_CODES,
                ).values_list('permission__code', flat=True)
            )
        return cache[user.id]

    def _invalidate_permission_cache(self, user_id: int) -> None:
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is not None:
            cache.pop(user_id, None)

    def has_permission(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> bool:
        user = acting_user or self.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        role_code = current_role or resolve_current_role(user)
        if role_code not in AUTH_ROLE_CODES:
            return False
        management_roles = set(user.roles.filter(code__in=AUTH_ROLE_CODES).values_list('code', flat=True))
        if management_roles != {role_code}:
            return False
        return permission_code in self._permission_codes_for(user)

    def get_capability_map(
        self,
        *,
        current_role: Optional[str] = None,
        user: Optional[User] = None,
    ) -> dict[str, dict]:
        acting_user = user or self.user
        codes = {item['code'] for item in PERMISSION_CATALOG}
        return {
            code: {
                'allowed': self.has_permission(
                    code,
                    acting_user=acting_user,
                    current_role=current_role,
                )
            }
            for code in sorted(codes)
        }

    def _get_target_management_user(self, user_id: int) -> User:
        target = self.validate_not_none(
            User.objects.filter(pk=user_id).first(),
            f'用户 {user_id} 不存在',
        )
        if target.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超级管理员不参与用户权限配置',
            )
        management_role_count = target.roles.filter(code__in=AUTH_ROLE_CODES).count()
        if management_role_count != 1:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='目标用户必须拥有且只能拥有一个管理角色',
            )
        if not self.user.is_superuser:
            role_code = resolve_current_role(self.user)
            visible = filter_users_by_management_role(
                user=self.user,
                role_code=role_code,
                queryset=User.objects.filter(pk=target.pk),
            ).exists()
            if not visible:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='目标用户不在当前管理范围内',
                )
        return target

    def get_user_permission_codes(self, user_id: int) -> list[str]:
        target = self._get_target_management_user(user_id)
        return sorted(self._permission_codes_for(target))

    def _get_configurable_permission(self, permission_code: str) -> Permission:
        if permission_code not in REGISTERED_PERMISSION_CODES:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'权限 {permission_code} 未注册',
            )
        if permission_code in SYSTEM_MANAGED_PERMISSION_CODES:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'权限 {permission_code} 为系统保留权限',
            )
        return self.validate_not_none(
            Permission.objects.filter(code=permission_code, is_active=True).first(),
            f'权限 {permission_code} 不存在',
        )

    @transaction.atomic
    def grant_user_permission(self, *, user_id: int, permission_code: str) -> list[str]:
        target = self._get_target_management_user(user_id)
        permission = self._get_configurable_permission(permission_code)
        UserPermission.objects.get_or_create(user=target, permission=permission)
        self._invalidate_permission_cache(target.id)
        audit_operation(
            operator=self.user,
            operation_type='authorization',
            action='grant_user_permission',
            description=f'授予权限：{permission.code}',
            target_type='user',
            target_id=str(target.id),
            target_title=target.username,
        )
        return self.get_user_permission_codes(target.id)

    @transaction.atomic
    def revoke_user_permission(self, *, user_id: int, permission_code: str) -> list[str]:
        target = self._get_target_management_user(user_id)
        permission = self._get_configurable_permission(permission_code)
        UserPermission.objects.filter(user=target, permission=permission).delete()
        self._invalidate_permission_cache(target.id)
        audit_operation(
            operator=self.user,
            operation_type='authorization',
            action='revoke_user_permission',
            description=f'撤销权限：{permission.code}',
            target_type='user',
            target_id=str(target.id),
            target_title=target.username,
        )
        return self.get_user_permission_codes(target.id)
