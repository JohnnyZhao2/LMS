"""权限判定统一入口：request-scoped Engine，调用方经 get_engine(request) 取用。"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Optional, Type

from django.db.models import QuerySet

from apps.authorization.roles import get_management_role_code
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .registry import get_resource_authorizer, get_scope_filter


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    message: str = ''


class AuthorizationEngine(BaseService):
    """单次请求内的管理态权限判定器。"""

    def has_permission(self, permission_code: str) -> bool:
        user = self.user
        if not user or not getattr(user, 'is_authenticated', False):
            return False
        if user.is_superuser:
            return bool(user.is_active)
        # 个人 user_permissions 只在管理角色下生效；无管理 Group 即普通员工
        if not get_management_role_code(user):
            return False
        return user.has_perm(permission_code)

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
        return filter_fn(self, queryset=queryset, context=context or {})


def get_engine(request) -> AuthorizationEngine:
    cached = getattr(request, '_authorization_engine', None)
    if cached is None:
        cached = AuthorizationEngine(request)
        setattr(request, '_authorization_engine', cached)
    return cached
