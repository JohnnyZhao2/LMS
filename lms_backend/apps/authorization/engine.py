"""权限判定统一入口。

外部业务代码只应该从本模块调用 `authorize/enforce/scope_filter`。这里把
“能力开关、资源级约束、列表范围过滤、请求级缓存”收束到同一个入口，避免
权限规则散落在 view/service 里。
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Optional, Type

from django.db.models import QuerySet

from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .constants import RESOURCE_AUTHORIZATION_HANDLERS, SCOPE_FILTER_HANDLERS
from .decisions import AuthorizationDecision
from .roles import filter_users_by_management_role, resolve_current_role
from .services import AuthorizationService


class AuthorizationEngine(BaseService):
    """单次请求内的权限判定器。

    每次实例化都绑定当前 request；缓存实际挂在 request 上，所以同一个请求里
    多次创建 engine 也能复用已解析的权限、范围和资源判定。
    """

    REQUEST_CACHE_ATTR = AuthorizationService.REQUEST_CACHE_ATTR

    def __init__(self, request):
        super().__init__(request)
        self._authorization_service = AuthorizationService(request)

    # ------------------------------------------------------------------
    # 请求缓存
    # ------------------------------------------------------------------

    def _get_request_cache(self) -> dict[str, dict[Any, Any]]:
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is None:
            cache = {}
            setattr(self.request, self.REQUEST_CACHE_ATTR, cache)
        cache.setdefault('base_permission_decisions', {})
        cache.setdefault('resource_decisions', {})
        cache.setdefault('scoped_user_ids', {})
        cache.setdefault('permission_codes', {})
        return cache

    def _get_cached_base_permission_decision(
        self,
        permission_code: str,
        error_message: Optional[str],
    ) -> Optional[AuthorizationDecision]:
        return self._get_request_cache()['base_permission_decisions'].get(
            (permission_code, error_message or '')
        )

    def _set_cached_base_permission_decision(
        self,
        permission_code: str,
        error_message: Optional[str],
        decision: AuthorizationDecision,
    ) -> AuthorizationDecision:
        self._get_request_cache()['base_permission_decisions'][
            (permission_code, error_message or '')
        ] = decision
        return decision

    def _get_resource_decision_cache_key(
        self,
        permission_code: str,
        resource: Optional[Any],
        error_message: Optional[str],
    ) -> Optional[tuple[Any, ...]]:
        if resource is None:
            return ('__global__', permission_code, error_message or '')
        resource_id = getattr(resource, 'pk', None)
        if resource_id is None:
            return None
        return (
            resource.__class__.__name__,
            resource_id,
            permission_code,
            error_message or '',
        )

    # ------------------------------------------------------------------
    # 基础权限判断 / 资源权限判断
    # ------------------------------------------------------------------

    def authorize(
        self,
        permission_code: str,
        *,
        resource: Optional[Any] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        decision_cache_key = self._get_resource_decision_cache_key(
            permission_code,
            resource,
            error_message,
        )
        if decision_cache_key is not None:
            cached_decision = self._get_request_cache()['resource_decisions'].get(decision_cache_key)
            if cached_decision is not None:
                return cached_decision

        # 权限点判断只在 Engine 做一次；业务 Handler 只回答资源范围。
        base = self.base_permission_decision(
            permission_code,
            error_message=error_message,
        )
        if not base.allowed or resource is None:
            decision = base
        else:
            decision = None
            for handler in RESOURCE_AUTHORIZATION_HANDLERS:
                if permission_code not in handler.permission_codes:
                    continue
                decision = handler.authorize(
                    self,
                    permission_code,
                    resource=resource,
                    error_message=error_message,
                )
                if decision is not None:
                    break
            if decision is None:
                decision = base

        if decision_cache_key is not None:
            self._get_request_cache()['resource_decisions'][decision_cache_key] = decision
        return decision

    def enforce(
        self,
        permission_code: str,
        *,
        resource: Optional[Any] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        decision = self.authorize(
            permission_code,
            resource=resource,
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
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        if not permission_codes:
            raise ValueError('permission_codes 不能为空')

        for permission_code in permission_codes:
            decision = self.authorize(
                permission_code,
                resource=resource,
                error_message=error_message,
            )
            if decision.allowed:
                return decision

        return AuthorizationDecision.deny(
            permission_codes[0],
            message=error_message or f"缺少任一权限: {', '.join(permission_codes)}",
        )

    def enforce_any(
        self,
        permission_codes: Sequence[str],
        *,
        resource: Optional[Any] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        decision = self.authorize_any(
            permission_codes,
            resource=resource,
            error_message=error_message,
        )
        if decision.allowed:
            return decision
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=decision.message or error_message or '缺少权限',
        )

    def base_permission_decision(
        self,
        permission_code: str,
        *,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        cached_decision = self._get_cached_base_permission_decision(permission_code, error_message)
        if cached_decision is not None:
            return cached_decision

        if self._authorization_service.has_permission(permission_code):
            decision = AuthorizationDecision.allow(permission_code)
        else:
            decision = AuthorizationDecision.deny(
                permission_code,
                message=error_message or f'缺少权限: {permission_code}',
            )
        return self._set_cached_base_permission_decision(permission_code, error_message, decision)

    # ------------------------------------------------------------------
    # 列表范围过滤 / 管理人员范围过滤
    # ------------------------------------------------------------------

    def get_current_role(self) -> Optional[str]:
        return resolve_current_role(self.user)

    def scope_filter(
        self,
        permission_code: str,
        *,
        resource_model: Optional[Type[Any]] = None,
        base_queryset: Optional[QuerySet] = None,
    ) -> QuerySet:
        queryset = base_queryset
        model = resource_model or (queryset.model if queryset is not None else None)
        if queryset is None:
            if model is None:
                raise ValueError('resource_model 和 base_queryset 不能同时为空')
            queryset = model.objects.all()

        if not self._authorization_service.has_permission(permission_code):
            return queryset.none()

        for handler in SCOPE_FILTER_HANDLERS:
            if handler.permission_code == permission_code and handler.resource_model is model:
                return handler.filter_queryset(self, queryset=queryset)
        return queryset

    def get_role_scoped_user_queryset(
        self,
        user_queryset: QuerySet,
        *,
        cache_key: Optional[str] = None,
    ) -> QuerySet:
        if not self.user or not self.user.is_authenticated:
            return user_queryset.none()
        if self.user.is_superuser:
            return user_queryset

        role_code = self.get_current_role()
        cache = self._get_request_cache()['scoped_user_ids']
        resolved_cache_key = (role_code or '', cache_key or '')
        if cache_key and resolved_cache_key in cache:
            return user_queryset.filter(id__in=cache[resolved_cache_key]).distinct()

        scoped = filter_users_by_management_role(
            user=self.user,
            role_code=role_code,
            queryset=user_queryset,
        ).distinct()
        if cache_key:
            cache[resolved_cache_key] = tuple(scoped.values_list('id', flat=True))
            return user_queryset.filter(id__in=cache[resolved_cache_key]).distinct()
        return scoped

    def get_scoped_learning_members(self) -> QuerySet:
        learners = User.objects.filter(
            is_active=True,
            roles__code='STUDENT',
        ).exclude(is_superuser=True).distinct()
        return self.get_role_scoped_user_queryset(learners, cache_key='learning_members')


def authorize(
    permission_code: str,
    request,
    *,
    resource: Optional[Any] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    """返回权限判定结果，不抛异常。

    适合菜单显隐、分支逻辑和“有权限则跳转编辑页”这类软判断。
    """
    return AuthorizationEngine(request).authorize(
        permission_code,
        resource=resource,
        error_message=error_message,
    )


def enforce(
    permission_code: str,
    request,
    *,
    resource: Optional[Any] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    """强制校验权限，失败时抛出业务异常。

    写操作、详情访问和资源级操作默认使用这个入口。
    """
    return AuthorizationEngine(request).enforce(
        permission_code,
        resource=resource,
        error_message=error_message,
    )


def authorize_any(
    permission_codes: Sequence[str],
    request,
    *,
    resource: Optional[Any] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    """任一权限通过即可返回允许结果。"""
    return AuthorizationEngine(request).authorize_any(
        permission_codes,
        resource=resource,
        error_message=error_message,
    )


def enforce_any(
    permission_codes: Sequence[str],
    request,
    *,
    resource: Optional[Any] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    """强制校验一组权限，只要其中一个通过即可。"""
    return AuthorizationEngine(request).enforce_any(
        permission_codes,
        resource=resource,
        error_message=error_message,
    )


def scope_filter(
    permission_code: str,
    request,
    *,
    resource_model: Optional[Type[Any]] = None,
    base_queryset: Optional[QuerySet] = None,
) -> QuerySet:
    """按当前用户权限范围过滤列表查询。

    业务列表不要手写“导师/团队/部门”过滤条件，统一通过模块
    `authorization.py` 注册的 scope handler 收敛。
    """
    return AuthorizationEngine(request).scope_filter(
        permission_code,
        resource_model=resource_model,
        base_queryset=base_queryset,
    )


def scope_learning_members(request, *, base_queryset: Optional[QuerySet] = None) -> QuerySet:
    """按当前管理角色过滤学员，不绑定权限点。"""
    engine = AuthorizationEngine(request)
    if base_queryset is None:
        return engine.get_scoped_learning_members()
    return engine.get_role_scoped_user_queryset(base_queryset)
