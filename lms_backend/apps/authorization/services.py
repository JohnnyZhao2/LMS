"""Authorization service backed by Django auth Group.permissions + RoleProfile."""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from typing import Iterable, Optional, Set

from django.contrib.auth.models import Group
from django.db import IntegrityError, transaction

from apps.activity_logs.decorators import log_operation
from apps.authorization.engine import AuthorizationEngine, get_engine
from apps.authorization.models import DataScope, RoleProfile
from apps.users.models import Department, User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .registry import expand_permission_codes
from .selectors import (
    get_assignable_permissions_by_codes,
    is_assignable_permission,
    permission_code,
)


def _extract_assignable_codes(permissions, *, prefetched: bool = False) -> Set[str]:
    """只保留可配置业务权限，忽略历史挂在 Group 上的子表噪音。"""
    items = permissions.all() if prefetched else permissions.select_related('content_type')
    return {
        permission_code(item)
        for item in items
        if is_assignable_permission(item)
    }


class AuthorizationService(BaseService):
    def get_user_permission_codes(self, *, user: Optional[User] = None) -> Set[str]:
        """用户有效业务权限：直接委托给 AuthorizationEngine.effective_permissions。"""
        target = user or self.user
        if not target or not getattr(target, 'is_authenticated', False) or not target.is_active:
            return set()
        if self.request is not None and self.user and self.user.pk == target.pk:
            engine = get_engine(self.request)
        else:
            engine = AuthorizationEngine(SimpleNamespace(user=target))
        return set(engine.effective_permissions)

    def list_roles(self) -> list[dict]:
        """列出所有角色（含数据范围、自定义部门与权限码）。"""
        get_engine(self.request).require_permission(
            'users.assign_user_role',
            error_message='无权查看角色列表',
        )
        profiles = list(
            RoleProfile.objects.select_related('group')
            .prefetch_related('departments', 'group__permissions__content_type')
            .order_by('-is_builtin', 'group_id')
        )
        return [
            self._serialize_role(
                profile.group,
                profile,
                prefetched=True,
            )
            for profile in profiles
        ]

    @log_operation(
        'authorization',
        'create_role',
        '新建自定义角色',
        target_type='group',
        target_title_template='{result[name]}',
        group='用户授权',
        label='新建角色',
    )
    @transaction.atomic
    def create_role(
        self,
        *,
        name: str,
        data_scope: str = DataScope.SELF,
        department_ids: Optional[list[int]] = None,
        permission_codes: Iterable[str] = (),
    ) -> dict:
        self._require_super_admin()
        normalized_name = self._validate_role_name(name)
        role_code = self._generate_role_code()
        departments = self._resolve_scope_departments(data_scope, department_ids)
        permission_objects = self._resolve_permissions(permission_codes)

        try:
            with transaction.atomic():
                group = Group.objects.create(name=role_code)
                profile = RoleProfile.objects.create(
                    group=group,
                    name=normalized_name,
                    data_scope=data_scope,
                    is_builtin=False,
                    is_active=True,
                )
        except IntegrityError:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='角色名称或编码已存在，请刷新后重试',
            )
        if departments:
            profile.departments.set(departments)
        if permission_objects:
            group.permissions.set(permission_objects)

        return self._serialize_role(group, profile)

    @log_operation(
        'authorization',
        'update_role',
        '更新角色配置',
        target_type='group',
        target_title_template='{result[name]}',
        group='用户授权',
        label='更新角色配置',
    )
    @transaction.atomic
    def update_role(
        self,
        *,
        role_code: str,
        name: Optional[str] = None,
        data_scope: Optional[str] = None,
        department_ids: Optional[list[int]] = None,
        is_active: Optional[bool] = None,
        permission_codes: Optional[Iterable[str]] = None,
    ) -> dict:
        self._require_super_admin()
        group, profile = self._get_role_group_and_profile(role_code, for_update=True)

        if profile.is_builtin:
            if name is not None and name.strip() != profile.name:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='系统内置角色名称不可修改',
                )
            if is_active is False:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='系统内置角色不可停用',
                )
            if group.name == 'ADMIN' and data_scope is not None and data_scope != DataScope.ALL:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='管理员数据范围固定为全部数据',
                )
        elif name is not None:
            profile.name = self._validate_role_name(name, exclude_profile_id=profile.id)

        next_scope = data_scope if data_scope is not None else profile.data_scope
        if next_scope == DataScope.CUSTOM_DEPT:
            target_dept_ids = (
                department_ids
                if department_ids is not None
                else list(profile.departments.values_list('id', flat=True))
            )
            departments = self._resolve_scope_departments(next_scope, target_dept_ids)
            profile.departments.set(departments)
        else:
            profile.departments.clear()
        profile.data_scope = next_scope

        if is_active is not None:
            profile.is_active = is_active

        try:
            with transaction.atomic():
                profile.save()
        except IntegrityError:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'角色名称「{profile.name}」已存在',
            )

        if permission_codes is not None:
            group.permissions.set(self._resolve_permissions(permission_codes))

        return self._serialize_role(group, profile)

    @log_operation(
        'authorization',
        'delete_role',
        '删除自定义角色',
        target_type='group',
        target_title_template='{result[name]}',
        group='用户授权',
        label='删除角色',
    )
    @transaction.atomic
    def delete_role(self, *, role_code: str) -> dict:
        self._require_super_admin()
        group, profile = self._get_role_group_and_profile(role_code, for_update=True)
        if profile.is_builtin:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='系统内置角色不可删除',
            )
        deleted_info = {'id': group.id, 'code': group.name, 'name': profile.name}
        group.delete()
        return deleted_info

    def _require_super_admin(self) -> None:
        if not self.user or not self.user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='仅超管可管理角色配置',
            )

    def _get_role_group_and_profile(
        self,
        role_code: str,
        *,
        for_update: bool = False,
    ) -> tuple[Group, RoleProfile]:
        queryset = RoleProfile.objects.select_related('group')
        if for_update:
            queryset = queryset.select_for_update(of=('self',))
        profile = (
            queryset
            .prefetch_related('departments')
            .filter(group__name=role_code)
            .first()
        )
        self.validate_not_none(profile, f'角色 {role_code} 不存在')
        return profile.group, profile

    @staticmethod
    def _validate_role_name(name: str, *, exclude_profile_id: Optional[int] = None) -> str:
        normalized = (name or '').strip()
        if not normalized:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='角色名称不能为空',
            )
        qs = RoleProfile.objects.filter(name=normalized)
        if exclude_profile_id is not None:
            qs = qs.exclude(pk=exclude_profile_id)
        if qs.exists():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'角色名称「{normalized}」已存在',
            )
        return normalized

    @staticmethod
    def _generate_role_code() -> str:
        while True:
            generated = f'ROLE_{uuid.uuid4().hex[:8].upper()}'
            if not Group.objects.filter(name=generated).exists():
                return generated

    @staticmethod
    def _resolve_scope_departments(
        data_scope: str,
        department_ids: Optional[list[int]],
    ) -> list[Department]:
        if data_scope not in DataScope.values:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'无效的数据范围: {data_scope}',
            )
        if data_scope != DataScope.CUSTOM_DEPT:
            return []
        unique_ids = list(dict.fromkeys(department_ids or []))
        if not unique_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='自定义部门范围必须至少选择一个部门',
            )
        departments = list(Department.objects.filter(id__in=unique_ids))
        if len(departments) != len(unique_ids):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='存在无效的部门 ID',
            )
        return departments

    @staticmethod
    def _serialize_role(
        group: Group,
        profile: RoleProfile,
        *,
        prefetched: bool = False,
    ) -> dict:
        perms = _extract_assignable_codes(group.permissions, prefetched=prefetched)
        dept_ids = (
            sorted(dept.id for dept in profile.departments.all())
            if prefetched
            else sorted(profile.departments.values_list('id', flat=True))
        )
        return {
            'id': group.id,
            'code': group.name,
            'name': profile.name,
            'data_scope': profile.data_scope,
            'department_ids': dept_ids,
            'is_builtin': profile.is_builtin,
            'is_active': profile.is_active,
            'permission_codes': sorted(perms),
        }

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
