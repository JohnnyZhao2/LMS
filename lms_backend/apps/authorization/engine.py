"""权限判定统一入口。"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Optional, Type

from django.db.models import QuerySet

from apps.authorization.roles import (
    get_managed_user_queryset,
    is_super_admin,
    learning_member_queryset,
    resolve_current_role,
)
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .constants import RESOURCE_AUTHORIZATION_HANDLERS, SCOPE_FILTER_HANDLERS
from .decisions import AuthorizationDecision
from .services import AuthorizationService


class AuthorizationEngine(BaseService):
    """单次请求内的管理态权限判定器。"""

    REQUEST_CACHE_ATTR = '_authorization_engine_cache'

    def __init__(self, request):
        super().__init__(request)
        self._authorization_service = AuthorizationService(request)

    def _get_request_cache(self) -> dict[str, Any]:
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is None:
            cache = {'permission_codes': None, 'scoped_learning_member_ids': None}
            setattr(self.request, self.REQUEST_CACHE_ATTR, cache)
        return cache

    def get_current_role(self) -> Optional[str]:
        return resolve_current_role(self.user)

    def get_permission_codes(self) -> set[str]:
        cache = self._get_request_cache()
        if cache['permission_codes'] is None:
            cache['permission_codes'] = self._authorization_service.get_user_permission_codes(
                user=self.user,
            )
        return cache['permission_codes']

    def has_permission(self, permission_code: str) -> bool:
        if is_super_admin(self.user):
            return True
        return permission_code in self.get_permission_codes()

    def base_permission_decision(
        self,
        permission_code: str,
        *,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        if self.has_permission(permission_code):
            return AuthorizationDecision.allow(permission_code)
        return AuthorizationDecision.deny(
            permission_code,
            message=error_message or f'缺少权限: {permission_code}',
            reason='permission_denied',
        )

    def authorize(
        self,
        permission_code: str,
        *,
        resource: Optional[Any] = None,
        context: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        context = context or {}
        for handler in RESOURCE_AUTHORIZATION_HANDLERS:
            if permission_code not in handler.permission_codes:
                continue
            decision = handler.authorize(
                self,
                permission_code,
                resource=resource,
                context=context,
                error_message=error_message,
            )
            if decision is not None:
                return decision
        return self.base_permission_decision(permission_code, error_message=error_message)

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

    def authorize_any(
        self,
        permission_codes: Sequence[str],
        *,
        resource: Optional[Any] = None,
        context: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        if not permission_codes:
            raise ValueError('permission_codes 不能为空')
        for permission_code in permission_codes:
            decision = self.authorize(
                permission_code,
                resource=resource,
                context=context,
                error_message=error_message,
            )
            if decision.allowed:
                return decision
        return AuthorizationDecision.deny(
            permission_codes[0],
            message=error_message or f"缺少任一权限: {', '.join(permission_codes)}",
            reason='permission_denied',
        )

    def enforce_any(
        self,
        permission_codes: Sequence[str],
        *,
        resource: Optional[Any] = None,
        context: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        decision = self.authorize_any(
            permission_codes,
            resource=resource,
            context=context,
            error_message=error_message,
        )
        if decision.allowed:
            return decision
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=decision.message or error_message or '缺少权限',
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

        if not self.has_permission(permission_code):
            return queryset.none()

        for handler in SCOPE_FILTER_HANDLERS:
            if handler.permission_code != permission_code or handler.resource_model is not model:
                continue
            return handler.filter_queryset(
                self,
                queryset=queryset,
                context=context or {},
            )
        return queryset

    def get_scoped_learning_members(self, permission_code: str) -> QuerySet:
        if not self.has_permission(permission_code):
            return learning_member_queryset().none()
        cache = self._get_request_cache()
        if cache['scoped_learning_member_ids'] is None:
            scoped = get_managed_user_queryset(
                self.user,
                self.get_current_role(),
                learning_member_queryset(),
            )
            cache['scoped_learning_member_ids'] = set(scoped.values_list('id', flat=True))
        ids = cache['scoped_learning_member_ids']
        if not ids:
            return learning_member_queryset().none()
        return learning_member_queryset().filter(id__in=ids)

    def get_scoped_user_queryset(self, permission_code: str, user_queryset: QuerySet) -> QuerySet:
        if not self.has_permission(permission_code):
            return user_queryset.none()
        return get_managed_user_queryset(self.user, self.get_current_role(), user_queryset)


def authorize(
    permission_code: str,
    request,
    *,
    resource: Optional[Any] = None,
    context: Optional[dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    return AuthorizationEngine(request).authorize(
        permission_code,
        resource=resource,
        context=context,
        error_message=error_message,
    )


def enforce(
    permission_code: str,
    request,
    *,
    resource: Optional[Any] = None,
    context: Optional[dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    return AuthorizationEngine(request).enforce(
        permission_code,
        resource=resource,
        context=context,
        error_message=error_message,
    )


def authorize_any(
    permission_codes: Sequence[str],
    request,
    *,
    resource: Optional[Any] = None,
    context: Optional[dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    return AuthorizationEngine(request).authorize_any(
        permission_codes,
        resource=resource,
        context=context,
        error_message=error_message,
    )


def enforce_any(
    permission_codes: Sequence[str],
    request,
    *,
    resource: Optional[Any] = None,
    context: Optional[dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    return AuthorizationEngine(request).enforce_any(
        permission_codes,
        resource=resource,
        context=context,
        error_message=error_message,
    )


def scope_filter(
    permission_code: str,
    request,
    *,
    resource_model: Optional[Type[Any]] = None,
    base_queryset: Optional[QuerySet] = None,
    context: Optional[dict[str, Any]] = None,
) -> QuerySet:
    return AuthorizationEngine(request).scope_filter(
        permission_code,
        resource_model=resource_model,
        base_queryset=base_queryset,
        context=context,
    )
