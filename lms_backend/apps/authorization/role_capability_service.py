from typing import Iterable, List, Optional, Set

from apps.authorization.roles import AUTH_ROLE_CODES, STUDENT_ROLE, SUPER_ADMIN_ROLE
from apps.users.models import Role
from core.exceptions import BusinessError, ErrorCodes

from .constants import (
    CONFIG_MODULE_PERMISSION_CODES,
    CONFIG_PERMISSION_MANAGEABLE_ROLE,
    PERMISSION_SCOPE_GROUPS,
    SCOPE_ALL,
    SYSTEM_MANAGED_PERMISSION_CODES,
)
from .models import Permission
from .role_capabilities import ROLE_PERMISSIONS


class RoleCapabilityServiceMixin:
    """读取代码声明的角色固定能力；不提供模版配置写入。"""

    @staticmethod
    def _can_manage_config_permissions(role_code: Optional[str]) -> bool:
        return role_code == CONFIG_PERMISSION_MANAGEABLE_ROLE

    @staticmethod
    def _reject_non_auth_role(role_code: str) -> None:
        if role_code == STUDENT_ROLE:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='学员为学习工作台身份，不参与授权配置',
            )
        if role_code not in AUTH_ROLE_CODES and role_code != SUPER_ADMIN_ROLE:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'角色 {role_code} 不在授权角色范围内',
            )

    @staticmethod
    def validate_role_code(role_code: str) -> Optional[Role]:
        RoleCapabilityServiceMixin._reject_non_auth_role(role_code)
        if role_code == SUPER_ADMIN_ROLE:
            return None
        return Role.objects.filter(code=role_code).first()

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
        return normalized_codes

    @classmethod
    def _get_role_permission_code_set(cls, role_code: str) -> Set[str]:
        return cls._normalize_role_permission_codes(
            role_code,
            ROLE_PERMISSIONS.get(role_code, ()),
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
