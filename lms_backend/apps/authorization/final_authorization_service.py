"""最终授权服务：角色模板、用户最终授权、运行时能力读取。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Optional, Sequence, Set

from django.db import transaction

from apps.activity_logs.decorators import log_operation
from apps.authorization.roles import SUPER_ADMIN_ROLE, resolve_current_role
from apps.users.models import Role, User, UserRole
from core.exceptions import BusinessError, ErrorCodes

from .constants import (
    FIXED_PERMISSION_REQUIRED_ROLES,
    PERMISSION_CATALOG,
    PERMISSION_CATALOG_BY_CODE,
    PERMISSION_IMPLIES_MAP,
    PERMISSION_SCOPE_GROUP_KEY_MAP,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_EXPLICIT_USERS,
    SCOPE_GROUP_CATALOG,
)
from .models import (
    Permission,
    RolePermission,
    RoleScope,
    UserRolePermission,
    UserRoleScope,
    UserRoleScopeMember,
)
from .registry import SCOPE_KIND_DATA, SCOPE_KIND_NONE, SCOPE_KIND_TARGET
from .selectors import get_permissions_by_codes

MANAGED_ROLE_CODES = frozenset({'MENTOR', 'DEPT_MANAGER', 'TEAM_MANAGER', 'ADMIN'})
STUDENT_ROLE_CODE = 'STUDENT'


@dataclass(frozen=True)
class ResolvedScope:
    """运行时解析后的最终范围，与业务模型无关。"""

    scope_kind: str
    scope_group_key: str
    scope_type: str
    member_ids: tuple[int, ...] = ()


def _validation_error(message: str) -> BusinessError:
    return BusinessError(code=ErrorCodes.VALIDATION_ERROR, message=message)


def required_scope_group_keys(permission_codes: Iterable[str]) -> set[str]:
    """返回权限集合所需的范围组键。"""
    keys: set[str] = set()
    for code in permission_codes:
        group_key = PERMISSION_SCOPE_GROUP_KEY_MAP.get(code)
        if group_key:
            keys.add(group_key)
    return keys


def assert_implies_closure(permission_codes: set[str]) -> None:
    """校验 implies 闭包完整；缺依赖直接拒绝，不自动补齐。"""
    missing: list[str] = []
    for code in sorted(permission_codes):
        for implied in PERMISSION_IMPLIES_MAP.get(code, []):
            if implied not in permission_codes:
                missing.append(f'{code}→{implied}')
    if missing:
        raise _validation_error(f'权限依赖不完整: {missing}')


def assert_fixed_permission_state(role_code: str, permission_codes: set[str]) -> None:
    """校验固定权限归属不可被手动改变。"""
    expected_fixed = {
        code
        for code, roles in FIXED_PERMISSION_REQUIRED_ROLES.items()
        if role_code in roles
    }
    forbidden_fixed = {
        code
        for code, roles in FIXED_PERMISSION_REQUIRED_ROLES.items()
        if role_code not in roles
    }
    actual_fixed = {
        code for code in permission_codes if code in FIXED_PERMISSION_REQUIRED_ROLES
    }
    if actual_fixed != expected_fixed:
        raise _validation_error(
            f'固定权限状态不可修改: role={role_code} '
            f'expected={sorted(expected_fixed)} actual={sorted(actual_fixed)}'
        )
    leaked = sorted(permission_codes & forbidden_fixed)
    if leaked:
        raise _validation_error(f'固定权限不可授予角色 {role_code}: {leaked}')


def _normalize_permission_codes(permission_codes: Iterable[str]) -> list[str]:
    codes = [code for code in permission_codes if code]
    if len(codes) != len(set(codes)):
        raise _validation_error('permission_codes 存在重复项')
    return codes


def _load_active_permissions(permission_codes: Sequence[str]) -> dict[str, Permission]:
    permissions = get_permissions_by_codes(permission_codes)
    by_code = {item.code: item for item in permissions}
    missing = sorted(set(permission_codes) - set(by_code))
    if missing:
        raise _validation_error(f'存在无效或未激活权限编码: {missing}')
    return by_code


def _validate_role_scopes(
    *,
    permission_codes: set[str],
    scopes: Sequence[dict],
    allow_explicit_users: bool,
) -> list[dict]:
    """校验并规范化 scopes 提交。"""
    required_keys = required_scope_group_keys(permission_codes)
    submitted_keys = [item.get('scope_group_key') for item in scopes]
    if len(submitted_keys) != len(set(submitted_keys)):
        raise _validation_error('scopes 存在重复的 scope_group_key')
    submitted_key_set = set(submitted_keys)
    if submitted_key_set != required_keys:
        raise _validation_error(
            f'范围组集合必须与 scoped 权限完全一致: '
            f'required={sorted(required_keys)} submitted={sorted(submitted_key_set)}'
        )

    normalized: list[dict] = []
    for item in scopes:
        group_key = item['scope_group_key']
        scope_type = item['scope_type']
        target_user_ids = sorted({int(uid) for uid in (item.get('target_user_ids') or [])})
        group_meta = SCOPE_GROUP_CATALOG.get(group_key)
        if not group_meta:
            raise _validation_error(f'范围组不存在: {group_key}')
        allowed = set(group_meta['allowed_scope_types'])
        if scope_type not in allowed:
            raise _validation_error(
                f'范围类型非法: {group_key}={scope_type} allowed={sorted(allowed)}'
            )
        scope_kind = group_meta['scope_kind']
        if scope_type == SCOPE_EXPLICIT_USERS:
            if not allow_explicit_users:
                raise _validation_error('角色模板禁止 EXPLICIT_USERS')
            if scope_kind != SCOPE_KIND_TARGET:
                raise _validation_error(f'DATA 范围组不允许 EXPLICIT_USERS: {group_key}')
            if not target_user_ids:
                raise _validation_error(f'EXPLICIT_USERS 必须指定人员: {group_key}')
        else:
            if target_user_ids:
                raise _validation_error(f'非 EXPLICIT_USERS 不得指定人员: {group_key}')
        if scope_kind == SCOPE_KIND_DATA and target_user_ids:
            raise _validation_error(f'DATA 范围不允许成员: {group_key}')
        normalized.append(
            {
                'scope_group_key': group_key,
                'scope_type': scope_type,
                'target_user_ids': target_user_ids,
            }
        )
    return normalized


def _learning_pool_user_ids() -> set[int]:
    """指定人员可选池：活跃学员（含兼任管理角色），排除超管。"""
    return set(
        User.objects.filter(
            is_active=True,
            is_superuser=False,
            roles__code=STUDENT_ROLE_CODE,
        )
        .values_list('id', flat=True)
        .distinct()
    )


def _assert_explicit_members_in_pool(scopes: Sequence[dict]) -> None:
    pool = _learning_pool_user_ids()
    for item in scopes:
        if item['scope_type'] != SCOPE_EXPLICIT_USERS:
            continue
        invalid = sorted(set(item['target_user_ids']) - pool)
        if invalid:
            raise _validation_error(
                f'指定人员不在允许人员池: scope_group_key={item["scope_group_key"]} '
                f'invalid_target_user_ids={invalid}'
            )


def cleanup_orphan_role_scopes(role: Role) -> None:
    """删除角色模板中已无剩余权限引用的范围。"""
    remaining_codes = set(
        RolePermission.objects.filter(role=role, permission__is_active=True).values_list(
            'permission__code',
            flat=True,
        )
    )
    keep_keys = required_scope_group_keys(remaining_codes)
    RoleScope.objects.filter(role=role).exclude(scope_group_key__in=keep_keys).delete()


def cleanup_orphan_user_role_scopes(user_role: UserRole) -> None:
    """删除 UserRole 中已无剩余权限引用的范围。"""
    remaining_codes = set(
        UserRolePermission.objects.filter(
            user_role=user_role,
            permission__is_active=True,
        ).values_list('permission__code', flat=True)
    )
    keep_keys = required_scope_group_keys(remaining_codes)
    UserRoleScope.objects.filter(user_role=user_role).exclude(scope_group_key__in=keep_keys).delete()


def copy_role_template_to_user_role(user_role: UserRole) -> None:
    """将角色模板完整复制到 UserRole（范围不含成员）。"""
    role = user_role.role
    permission_rows = list(
        RolePermission.objects.filter(role=role, permission__is_active=True).select_related('permission')
    )
    scope_rows = list(RoleScope.objects.filter(role=role))

    UserRolePermission.objects.filter(user_role=user_role).delete()
    UserRoleScope.objects.filter(user_role=user_role).delete()

    UserRolePermission.objects.bulk_create(
        [
            UserRolePermission(user_role=user_role, permission=row.permission)
            for row in permission_rows
        ],
        batch_size=500,
    )
    UserRoleScope.objects.bulk_create(
        [
            UserRoleScope(
                user_role=user_role,
                scope_group_key=row.scope_group_key,
                scope_type=row.scope_type,
            )
            for row in scope_rows
        ],
        batch_size=500,
    )


def get_managed_user_role(user: User) -> UserRole:
    """返回用户恰好一个管理角色对应的 UserRole。"""
    if user.is_superuser:
        raise _validation_error('超管账号不支持用户级最终授权')
    managed_roles = list(
        UserRole.objects.select_related('role', 'user')
        .filter(user_id=user.id, role__code__in=MANAGED_ROLE_CODES)
        .order_by('id')
    )
    if not managed_roles:
        raise _validation_error('用户没有管理角色，不支持用户级最终授权')
    if len(managed_roles) > 1:
        codes = sorted({item.role.code for item in managed_roles})
        raise _validation_error(f'用户异常存在多个管理角色: {codes}')
    return managed_roles[0]


class FinalAuthorizationServiceMixin:
    """角色模板 + 用户最终授权 + 运行时最终能力。"""

    @staticmethod
    def validate_role_code(role_code: str) -> Optional[Role]:
        if role_code == SUPER_ADMIN_ROLE:
            return None
        return Role.objects.filter(code=role_code).first()

    def get_role_template(self, role_code: str) -> dict:
        """读取角色模板完整状态。"""
        if role_code == SUPER_ADMIN_ROLE:
            raise _validation_error('超管为系统专有角色，不支持角色模板')
        role = self.validate_not_none(self.validate_role_code(role_code), f'角色 {role_code} 不存在')
        permission_codes = sorted(
            RolePermission.objects.filter(role=role, permission__is_active=True).values_list(
                'permission__code',
                flat=True,
            )
        )
        scopes = [
            {
                'scope_group_key': row.scope_group_key,
                'scope_type': row.scope_type,
            }
            for row in RoleScope.objects.filter(role=role).order_by('scope_group_key')
        ]
        return {
            'role_code': role_code,
            'permission_codes': permission_codes,
            'scopes': scopes,
        }

    @transaction.atomic
    @log_operation(
        'authorization',
        'replace_role_template',
        '{permission_count} 项权限',
        target_type='role',
        target_title_template='{role_code}',
        group='角色模板',
        label='更新角色模板',
    )
    def replace_role_template(
        self,
        *,
        role_code: str,
        permission_codes: Iterable[str],
        scopes: Sequence[dict],
    ) -> dict:
        """完整替换角色模板（不影响已有 UserRolePermission）。"""
        if role_code == SUPER_ADMIN_ROLE:
            raise _validation_error('超管为系统专有角色，不支持配置模板权限')
        role = self.validate_not_none(self.validate_role_code(role_code), f'角色 {role_code} 不存在')

        codes = _normalize_permission_codes(permission_codes)
        code_set = set(codes)
        _load_active_permissions(codes)
        assert_implies_closure(code_set)
        assert_fixed_permission_state(role_code, code_set)
        normalized_scopes = _validate_role_scopes(
            permission_codes=code_set,
            scopes=scopes,
            allow_explicit_users=False,
        )

        permission_objects = list(Permission.objects.filter(code__in=codes, is_active=True))
        RolePermission.objects.filter(role=role).delete()
        RoleScope.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create(
            [RolePermission(role=role, permission=permission) for permission in permission_objects],
            batch_size=500,
        )
        RoleScope.objects.bulk_create(
            [
                RoleScope(
                    role=role,
                    scope_group_key=item['scope_group_key'],
                    scope_type=item['scope_type'],
                )
                for item in normalized_scopes
            ],
            batch_size=500,
        )
        return self.get_role_template(role_code)

    def get_user_authorization(self, user_id: int) -> dict:
        """读取管理用户最终授权。"""
        user = self.validate_not_none(User.objects.filter(pk=user_id).first(), f'用户 {user_id} 不存在')
        user_role = get_managed_user_role(user)
        permission_codes = sorted(
            UserRolePermission.objects.filter(
                user_role=user_role,
                permission__is_active=True,
            ).values_list('permission__code', flat=True)
        )
        scopes = []
        for row in (
            UserRoleScope.objects.filter(user_role=user_role)
            .prefetch_related('members')
            .order_by('scope_group_key')
        ):
            member_ids = sorted(member.target_user_id for member in row.members.all())
            payload = {
                'scope_group_key': row.scope_group_key,
                'scope_type': row.scope_type,
            }
            if row.scope_type == SCOPE_EXPLICIT_USERS:
                payload['target_user_ids'] = member_ids
            scopes.append(payload)
        return {
            'role_code': user_role.role.code,
            'permission_codes': permission_codes,
            'scopes': scopes,
        }

    @transaction.atomic
    @log_operation(
        'authorization',
        'replace_user_authorization',
        '{permission_count} 项权限',
        target_type='user',
        target_title_template='用户#{user_id}',
        group='用户授权',
        label='更新用户最终授权',
    )
    def replace_user_authorization(
        self,
        *,
        user_id: int,
        permission_codes: Iterable[str],
        scopes: Sequence[dict],
    ) -> dict:
        """完整替换用户最终授权。"""
        user = self.validate_not_none(User.objects.filter(pk=user_id).first(), f'用户 {user_id} 不存在')
        user_role = get_managed_user_role(user)
        role_code = user_role.role.code

        codes = _normalize_permission_codes(permission_codes)
        code_set = set(codes)
        _load_active_permissions(codes)
        assert_implies_closure(code_set)
        assert_fixed_permission_state(role_code, code_set)
        normalized_scopes = _validate_role_scopes(
            permission_codes=code_set,
            scopes=scopes,
            allow_explicit_users=True,
        )
        _assert_explicit_members_in_pool(normalized_scopes)

        permission_objects = list(Permission.objects.filter(code__in=codes, is_active=True))
        UserRolePermission.objects.filter(user_role=user_role).delete()
        UserRoleScope.objects.filter(user_role=user_role).delete()
        UserRolePermission.objects.bulk_create(
            [
                UserRolePermission(user_role=user_role, permission=permission)
                for permission in permission_objects
            ],
            batch_size=500,
        )
        scope_objs = [
            UserRoleScope(
                user_role=user_role,
                scope_group_key=item['scope_group_key'],
                scope_type=item['scope_type'],
            )
            for item in normalized_scopes
        ]
        UserRoleScope.objects.bulk_create(scope_objs, batch_size=500)
        created_scopes = {
            row.scope_group_key: row
            for row in UserRoleScope.objects.filter(user_role=user_role)
        }
        members: list[UserRoleScopeMember] = []
        for item in normalized_scopes:
            if item['scope_type'] != SCOPE_EXPLICIT_USERS:
                continue
            scope_row = created_scopes[item['scope_group_key']]
            for target_user_id in item['target_user_ids']:
                members.append(
                    UserRoleScopeMember(
                        user_role_scope=scope_row,
                        target_user_id=target_user_id,
                    )
                )
        if members:
            UserRoleScopeMember.objects.bulk_create(members, batch_size=500)
        return self.get_user_authorization(user_id)

    @transaction.atomic
    @log_operation(
        'authorization',
        'reset_user_authorization',
        '重置为角色模板',
        target_type='user',
        target_title_template='用户#{user_id}',
        group='用户授权',
        label='重置用户最终授权',
    )
    def reset_user_authorization(self, *, user_id: int) -> dict:
        """删除用户当前最终授权并复制角色模板。"""
        user = self.validate_not_none(User.objects.filter(pk=user_id).first(), f'用户 {user_id} 不存在')
        user_role = get_managed_user_role(user)
        copy_role_template_to_user_role(user_role)
        return self.get_user_authorization(user_id)

    def get_final_permission_codes(
        self,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> Set[str]:
        """读取当前角色下最终权限编码集合。"""
        base_user = acting_user or self.user
        if not base_user or not getattr(base_user, 'is_authenticated', False):
            return set()
        if base_user.is_superuser:
            return set(Permission.objects.filter(is_active=True).values_list('code', flat=True))

        resolved_role = current_role or resolve_current_role(base_user)
        if not resolved_role:
            return set()

        cache = self._get_request_cache()
        cache_key = (base_user.id, resolved_role)
        cached = cache['final_permission_codes'].get(cache_key)
        if cached is not None:
            return set(cached)

        if resolved_role == STUDENT_ROLE_CODE:
            codes = set(
                RolePermission.objects.filter(
                    role__code=STUDENT_ROLE_CODE,
                    permission__is_active=True,
                ).values_list('permission__code', flat=True)
            )
        elif resolved_role in MANAGED_ROLE_CODES:
            codes = set(
                UserRolePermission.objects.filter(
                    user_role__user_id=base_user.id,
                    user_role__role__code=resolved_role,
                    permission__is_active=True,
                ).values_list('permission__code', flat=True)
            )
        else:
            codes = set()

        cache['final_permission_codes'][cache_key] = frozenset(codes)
        return codes

    def get_resolved_scope(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> Optional[ResolvedScope]:
        """读取 scoped 权限的最终范围；缺失返回 None。"""
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(permission_code)
        if not catalog_item:
            return None
        scope_kind = catalog_item.get('scope_kind') or SCOPE_KIND_NONE
        group_key = catalog_item.get('scope_group_key')
        if scope_kind == SCOPE_KIND_NONE or not group_key:
            return None

        base_user = acting_user or self.user
        if not base_user or not getattr(base_user, 'is_authenticated', False):
            return None
        if base_user.is_superuser:
            return ResolvedScope(
                scope_kind=scope_kind,
                scope_group_key=group_key,
                scope_type='ALL',
                member_ids=(),
            )

        resolved_role = current_role or resolve_current_role(base_user)
        if not resolved_role:
            return None

        cache = self._get_request_cache()
        cache_key = (base_user.id, resolved_role, group_key)
        if cache_key in cache['final_scopes']:
            return cache['final_scopes'][cache_key]

        resolved: Optional[ResolvedScope] = None
        if resolved_role == STUDENT_ROLE_CODE:
            row = RoleScope.objects.filter(role__code=STUDENT_ROLE_CODE, scope_group_key=group_key).first()
            if row is not None:
                resolved = ResolvedScope(
                    scope_kind=scope_kind,
                    scope_group_key=group_key,
                    scope_type=row.scope_type,
                    member_ids=(),
                )
        elif resolved_role in MANAGED_ROLE_CODES:
            row = (
                UserRoleScope.objects.filter(
                    user_role__user_id=base_user.id,
                    user_role__role__code=resolved_role,
                    scope_group_key=group_key,
                )
                .prefetch_related('members')
                .first()
            )
            if row is not None:
                member_ids = tuple(
                    sorted(member.target_user_id for member in row.members.all())
                )
                resolved = ResolvedScope(
                    scope_kind=scope_kind,
                    scope_group_key=group_key,
                    scope_type=row.scope_type,
                    member_ids=member_ids,
                )

        cache['final_scopes'][cache_key] = resolved
        return resolved

    def _is_permission_granted(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> bool:
        """最终权限集合包含判断（不做运行时 implies）。"""
        base_user = acting_user or self.user
        if not base_user or not getattr(base_user, 'is_authenticated', False):
            return False
        if base_user.is_superuser:
            return True
        return permission_code in self.get_final_permission_codes(
            acting_user=base_user,
            current_role=current_role,
        )

    def is_capability_granted(
        self,
        permission_code: str,
        *,
        acting_user: Optional[User] = None,
        current_role: Optional[str] = None,
    ) -> bool:
        """能力开关：最终权限集包含，且 scoped 权限必须有最终范围。"""
        if not self._is_permission_granted(
            permission_code,
            acting_user=acting_user,
            current_role=current_role,
        ):
            return False
        if permission_code not in SCOPE_AWARE_PERMISSION_CODES:
            return True
        return (
            self.get_resolved_scope(
                permission_code,
                acting_user=acting_user,
                current_role=current_role,
            )
            is not None
        )

    def get_capability_map(
        self,
        *,
        current_role: Optional[str] = None,
        user: Optional[User] = None,
    ) -> dict[str, dict]:
        """登录态能力图。"""
        resolved_role = current_role or resolve_current_role(user or self.user)
        capability_map: dict[str, dict] = {}
        for item in PERMISSION_CATALOG:
            permission_code = item['code']
            allowed = (
                self.is_capability_granted(
                    permission_code,
                    acting_user=user,
                    current_role=resolved_role,
                )
                if resolved_role
                else False
            )
            capability_map[permission_code] = {'allowed': allowed}
        return capability_map
