"""权限判定统一入口：request-scoped Engine，调用方经 get_engine(request) 取用。"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, Optional, Type

from django.contrib.auth.models import Group
from django.db.models import QuerySet

from apps.authorization.models import DataScope
from apps.authorization.roles import (
    get_group_profile,
    get_scoped_user_queryset,
)
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .registry import ASSIGNABLE_PERMISSION_CODES, get_resource_authorizer, get_scope_filter
from .selectors import permission_code as _perm_code


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    message: str = ''


class AuthorizationEngine(BaseService):
    """单次请求内的管理态权限判定器（支持 Group + RoleProfile 多角色防串权，忽略 user.user_permissions）。"""

    def __init__(self, request):
        super().__init__(request)
        self._grants_loaded = False
        self._perm_to_groups: dict[str, list[Group]] = {}
        self._effective_permissions: set[str] = set()

    def _load_user_grants(self) -> None:
        if self._grants_loaded:
            return
        self._grants_loaded = True
        user = self.user
        if not user or not getattr(user, 'is_authenticated', False) or not user.is_active:
            return
        if user.is_superuser:
            self._effective_permissions = set(ASSIGNABLE_PERMISSION_CODES)
            return

        groups = list(
            user.groups.select_related('profile')
            .prefetch_related('permissions__content_type', 'profile__departments')
            .all()
        )
        perm_to_groups: dict[str, list[Group]] = {}
        for group in groups:
            profile = get_group_profile(group)
            if profile is None or not profile.is_active:
                continue
            for perm in group.permissions.all():
                code = _perm_code(perm)
                if code in ASSIGNABLE_PERMISSION_CODES:
                    perm_to_groups.setdefault(code, []).append(group)

        self._perm_to_groups = perm_to_groups
        self._effective_permissions = set(perm_to_groups.keys())

    @property
    def effective_permissions(self) -> set[str]:
        self._load_user_grants()
        return self._effective_permissions

    def has_permission(self, permission_code: str) -> bool:
        user = self.user
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if user.is_superuser:
            return bool(user.is_active)
        return permission_code in self.effective_permissions

    def _aggregate_groups_scope(self, groups: list[Group]) -> tuple[str, set[int]]:
        if not groups:
            return (DataScope.SELF, set())
        dept_ids: set[int] = set()
        has_custom = False
        has_dept = False
        for group in groups:
            profile = get_group_profile(group)
            if profile is None:
                continue
            scope = profile.data_scope
            if scope == DataScope.ALL:
                return (DataScope.ALL, set())
            if scope == DataScope.CUSTOM_DEPT:
                has_custom = True
                dept_ids.update(dept.id for dept in profile.departments.all())
            elif scope == DataScope.DEPT:
                has_dept = True
                if self.user.department_id:
                    dept_ids.add(self.user.department_id)
        if has_custom:
            return (DataScope.CUSTOM_DEPT, dept_ids)
        if has_dept:
            return (DataScope.DEPT, dept_ids)
        return (DataScope.SELF, set())

    def get_permission_scope(self, permission_code: str) -> tuple[str, set[int]]:
        """按具体权限码聚合授予该权限的激活角色组范围，避免多角色串权。"""
        user = self.user
        if not user or not getattr(user, 'is_authenticated', False) or not user.is_active:
            return (DataScope.SELF, set())
        if user.is_superuser:
            return (DataScope.ALL, set())

        self._load_user_grants()
        return self._aggregate_groups_scope(self._perm_to_groups.get(permission_code, []))

    def has_full_scope(self, permission_code: str) -> bool:
        return self.get_permission_scope(permission_code)[0] == DataScope.ALL

    def filter_users_by_scope(
        self,
        permission_code: str,
        base_queryset: QuerySet,
    ) -> QuerySet:
        scope, dept_ids = self.get_permission_scope(permission_code)
        return get_scoped_user_queryset(
            self.user,
            base_queryset,
            data_scope=scope,
            department_ids=dept_ids,
        )

    def base_permission_decision(
        self,
        permission_code: str,
        *,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        if self.has_permission(permission_code):
            return AuthorizationDecision(True)
        return AuthorizationDecision(
            False,
            message=error_message or f'缺少权限: {permission_code}',
        )

    def authorize(
        self,
        permission_code: str,
        *,
        resource: Optional[Any] = None,
        context: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        authorizer = get_resource_authorizer(permission_code)
        if authorizer is None:
            if resource is not None:
                raise ValueError(f'未注册资源授权: {permission_code}')
            return self.base_permission_decision(permission_code, error_message=error_message)

        decision = authorizer(
            self,
            permission_code,
            resource=resource,
            context=context or {},
            error_message=error_message,
        )
        if decision is None:
            if resource is None:
                raise ValueError(f'{permission_code} 必须传 resource')
            raise ValueError(
                f'未处理的资源类型: {permission_code} / {type(resource).__name__}'
            )
        return decision

    def require_permission(
        self,
        permission_code: str,
        *,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        """只查功能权限，不走资源 authorizer。"""
        decision = self.base_permission_decision(permission_code, error_message=error_message)
        if decision.allowed:
            return decision
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=decision.message or error_message or f'缺少权限: {permission_code}',
        )

    def enforce(
        self,
        permission_code: str,
        *,
        resource: Optional[Any] = None,
        context: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        decision = self.authorize(
            permission_code,
            resource=resource,
            context=context,
            error_message=error_message,
        )
        if decision.allowed:
            return decision
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=decision.message or error_message or f'缺少权限: {permission_code}',
        )

    def enforce_any(
        self,
        permission_codes: Sequence[str],
        *,
        resource: Optional[Any] = None,
        context: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        if not permission_codes:
            raise ValueError('permission_codes 不能为空')
        if resource is None:
            for permission_code in permission_codes:
                if self.has_permission(permission_code):
                    return AuthorizationDecision(True)
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message=error_message or '缺少权限',
            )
        last_message = error_message or '缺少权限'
        for permission_code in permission_codes:
            decision = self.authorize(
                permission_code,
                resource=resource,
                context=context,
                error_message=error_message,
            )
            if decision.allowed:
                return decision
            last_message = decision.message or last_message
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=last_message,
        )

    def scope_filter(
        self,
        permission_code: str,
        *,
        resource_model: Optional[Type[Any]] = None,
        base_queryset: Optional[QuerySet] = None,
        context: Optional[dict[str, Any]] = None,
    ) -> QuerySet:
        queryset = base_queryset
        model = resource_model or (queryset.model if queryset is not None else None)
        if queryset is None:
            if model is None:
                raise ValueError('resource_model 和 base_queryset 不能同时为空')
            queryset = model.objects.all()

        filter_fn = get_scope_filter(permission_code, model)
        if filter_fn is None:
            raise ValueError(f'未注册 scope: {permission_code} / {model.__name__}')
        if not self.has_permission(permission_code):
            return queryset.none()
        effective_context = {**(context or {}), '_permission_code': permission_code}
        return filter_fn(self, queryset=queryset, context=effective_context)


def get_engine(request) -> AuthorizationEngine:
    cached = getattr(request, '_authorization_engine', None)
    if cached is None:
        cached = AuthorizationEngine(request)
        setattr(request, '_authorization_engine', cached)
    return cached
