"""Authorization service backed by Django auth permissions."""

from typing import Iterable, List, Optional, Set

from django.contrib.auth.models import Group
from django.db import transaction

from apps.activity_logs.decorators import log_operation
from apps.authorization.roles import MANAGEMENT_ROLE_CODES, is_super_admin
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .constants import REGISTERED_PERMISSION_CODES
from .registry import expand_permission_codes
from .selectors import get_permissions_by_codes, list_permissions


class AuthorizationService(BaseService):
    def list_permission_catalog(self, module: Optional[str] = None):
        return list_permissions(module=module)

    def get_user_permission_codes(self, *, user: Optional[User] = None) -> Set[str]:
        target = user or self.user
        if not target or not getattr(target, 'is_authenticated', False):
            return set()
        if is_super_admin(target):
            return set(REGISTERED_PERMISSION_CODES)
        granted = target.get_all_permissions()
        return {code for code in REGISTERED_PERMISSION_CODES if code in granted}

    def is_capability_granted(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> bool:
        del current_role  # 功能权限与当前角色脱钩；人员范围另算
        base_user = acting_user or self.user
        if not base_user or not getattr(base_user, 'is_authenticated', False):
            return False
        if is_super_admin(base_user):
            return True
        return permission_code in self.get_user_permission_codes(user=base_user)

    def get_capability_map(
        self,
        *,
        current_role: Optional[str] = None,
        user: Optional[User] = None,
    ) -> dict[str, dict]:
        del current_role
        codes = self.get_user_permission_codes(user=user)
        return {
            permission_code: {'allowed': permission_code in codes or is_super_admin(user or self.user)}
            for permission_code in sorted(REGISTERED_PERMISSION_CODES)
        }

    def list_user_permission_codes(self, *, user_id: int) -> List[str]:
        target = self.validate_not_none(
            User.objects.filter(pk=user_id).first(),
            f'用户 {user_id} 不存在',
        )
        if target.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管账号为专有角色，不支持配置用户权限',
            )
        return sorted(self.get_user_permission_codes(user=target))

    def list_user_group_permission_codes(self, *, user_id: int) -> List[str]:
        target = self.validate_not_none(
            User.objects.filter(pk=user_id).first(),
            f'用户 {user_id} 不存在',
        )
        granted = target.get_group_permissions()
        return sorted(code for code in REGISTERED_PERMISSION_CODES if code in granted)

    def list_group_permission_codes(self, *, role_code: str) -> List[str]:
        group = self._get_management_group(role_code)
        granted = {
            f'{item.content_type.app_label}.{item.codename}'
            for item in group.permissions.select_related('content_type')
        }
        return sorted(code for code in REGISTERED_PERMISSION_CODES if code in granted)

    @transaction.atomic
    @log_operation(
        'authorization',
        'replace_group_permissions',
        '更新角色默认权限',
        target_type='group',
        target_title_template='{result.name}',
        group='用户授权',
        label='更新角色默认权限',
    )
    def replace_group_permissions(self, *, role_code: str, permission_codes: Iterable[str]) -> Group:
        group = self._get_management_group(role_code)
        _, permission_objects = self._resolve_permissions(permission_codes)
        group.permissions.set(permission_objects)
        return group

    @transaction.atomic
    @log_operation(
        'authorization',
        'replace_user_permissions',
        '更新用户最终权限',
        target_type='user',
        target_title_template='{result.username}',
        group='用户授权',
        label='更新用户权限',
    )
    def replace_user_permissions(self, *, user_id: int, permission_codes: Iterable[str]) -> User:
        target = self.validate_not_none(
            User.objects.filter(pk=user_id).first(),
            f'用户 {user_id} 不存在',
        )
        if target.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管账号为专有角色，不支持配置用户权限',
            )
        management_codes = set(target.role_codes) & MANAGEMENT_ROLE_CODES
        if not management_codes:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='仅管理角色用户可配置功能权限',
            )

        normalized_codes, _ = self._resolve_permissions(permission_codes)

        inherited_codes = set(self.list_user_group_permission_codes(user_id=user_id))
        target.user_permissions.set(
            get_permissions_by_codes(code for code in normalized_codes if code not in inherited_codes)
        )
        return target

    def _get_management_group(self, role_code: str) -> Group:
        if role_code not in MANAGEMENT_ROLE_CODES:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='仅支持配置管理角色权限',
            )
        return self.validate_not_none(
            Group.objects.filter(name=role_code).first(),
            f'角色 {role_code} 不存在',
        )

    @staticmethod
    def _resolve_permissions(permission_codes: Iterable[str]):
        normalized_codes = sorted(set(expand_permission_codes(permission_codes)))
        invalid_codes = sorted(set(normalized_codes) - set(REGISTERED_PERMISSION_CODES))
        if invalid_codes:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'存在无效权限编码: {invalid_codes}',
            )
        permission_objects = get_permissions_by_codes(normalized_codes)
        resolved = {
            f'{item.content_type.app_label}.{item.codename}' for item in permission_objects
        }
        missing_codes = sorted(code for code in normalized_codes if code not in resolved)
        if missing_codes:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'权限尚未注册: {missing_codes}',
            )
        return normalized_codes, permission_objects
