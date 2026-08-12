"""Authorization service backed by Django auth Group.permissions."""

from typing import Iterable, List, Optional, Set

from django.contrib.auth.models import Group
from django.db import transaction

from apps.activity_logs.decorators import log_operation
from apps.authorization.roles import get_management_role_code
from apps.users.models import MANAGEMENT_ROLE_CODES, User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .registry import ASSIGNABLE_PERMISSION_CODES, expand_permission_codes
from .selectors import (
    get_assignable_permissions_by_codes,
    is_assignable_permission,
    list_permissions,
    permission_code,
)


def _codes_from_permissions(permissions) -> Set[str]:
    """只保留可配置业务权限，忽略历史挂在 Group 上的子表噪音。"""
    return {
        permission_code(item)
        for item in permissions.select_related('content_type')
        if is_assignable_permission(item)
    }


class AuthorizationService(BaseService):
    def get_user_permission_codes(self, *, user: Optional[User] = None) -> Set[str]:
        """用户有效业务权限：Group.permissions ∪ user_permissions。

        - is_superuser → 业务 Permission 全集
        - 无管理 Group → 空集（学习不走授权码）
        """
        target = user or self.user
        if not target or not getattr(target, 'is_authenticated', False):
            return set()
        if target.is_superuser:
            return {item['code'] for item in list_permissions()}
        if not get_management_role_code(target):
            return set()
        return {code for code in target.get_all_permissions() if code in ASSIGNABLE_PERMISSION_CODES}

    def list_group_permission_codes(self, *, role_code: str) -> List[str]:
        self._require_super_admin_for_group_permissions()
        group = self._get_management_group(role_code)
        return sorted(_codes_from_permissions(group.permissions))

    def user_permission_payload(self, *, user: User) -> dict:
        """管理端查看目标用户权限：按其管理角色基础 + 额外。"""
        target = self._ensure_manageable_user(user)
        management_role = get_management_role_code(target)
        if not management_role:
            return {
                'user_id': target.id,
                'permission_codes': [],
                'base_permission_codes': [],
            }
        base_codes = self._group_permission_codes_for_role(management_role)
        return {
            'user_id': target.id,
            'permission_codes': sorted(base_codes | _codes_from_permissions(target.user_permissions)),
            'base_permission_codes': sorted(base_codes),
        }

    @transaction.atomic
    @log_operation(
        'authorization',
        'replace_group_permissions',
        '更新角色基础权限',
        target_type='group',
        target_title_template='{role_code}',
        group='用户授权',
        label='更新角色基础权限',
    )
    def replace_group_permissions(self, *, role_code: str, permission_codes: Iterable[str]) -> list[str]:
        self._require_super_admin_for_group_permissions()
        group = self._get_management_group(role_code)
        group.permissions.set(self._resolve_permissions(permission_codes))
        return sorted(_codes_from_permissions(group.permissions))

    @transaction.atomic
    @log_operation(
        'authorization',
        'replace_user_permissions',
        '更新用户额外权限',
        target_type='user',
        target_title_template='{result.username}',
        group='用户授权',
        label='更新用户额外权限',
    )
    def replace_user_permissions(self, *, user: User, permission_codes: Iterable[str]) -> User:
        target = self._ensure_manageable_user(user)
        management_role = get_management_role_code(target)
        if not management_role:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='仅管理角色用户可配置功能权限',
            )

        permission_objects = self._resolve_permissions(permission_codes)
        base_codes = self._group_permission_codes_for_role(management_role)
        target.user_permissions.set([
            item for item in permission_objects if permission_code(item) not in base_codes
        ])
        return target

    def _require_super_admin_for_group_permissions(self) -> None:
        if not self.user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='仅超管可配置角色基础权限',
            )

    @staticmethod
    def _ensure_manageable_user(user: User) -> User:
        if user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='超管账号为专有角色，不支持配置用户权限',
            )
        return user

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
    def _group_permission_codes_for_role(role_code: str) -> Set[str]:
        group = Group.objects.filter(name=role_code).first()
        if not group:
            return set()
        return _codes_from_permissions(group.permissions)

    @staticmethod
    def _resolve_permissions(permission_codes: Iterable[str]):
        normalized_codes = sorted(set(expand_permission_codes(permission_codes)))
        permission_objects = get_assignable_permissions_by_codes(normalized_codes)
        resolved = {permission_code(item) for item in permission_objects}
        missing_codes = sorted(code for code in normalized_codes if code not in resolved)
        if missing_codes:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'存在无效或不可配置权限: {missing_codes}',
            )
        return permission_objects
