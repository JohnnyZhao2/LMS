"""权限判定统一入口。

外部业务代码只应该从本模块调用 `authorize/enforce/scope_filter`。这里把
“能力开关、资源级约束、列表范围过滤、请求级缓存”收束到同一个入口，避免
权限规则散落在 view/service 里。
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any, Optional, Type

from django.db.models import QuerySet

from core.base_service import BaseService

from .decisions import AuthorizationDecision
from .engine_cache import AuthorizationEngineCacheMixin
from .resource_policy_engine import ResourcePolicyEngineMixin
from .scoped_queryset import ScopedQuerysetEngineMixin
from .services import AuthorizationService


class AuthorizationEngine(
    AuthorizationEngineCacheMixin,
    ResourcePolicyEngineMixin,
    ScopedQuerysetEngineMixin,
    BaseService,
):
    """单次请求内的权限判定器。

    每次实例化都绑定当前 request；缓存实际挂在 request 上，所以同一个请求里
    多次创建 engine 也能复用已解析的权限、范围和资源判定。
    """

    def __init__(self, request):
        super().__init__(request)
        self._authorization_service = AuthorizationService(request)


def authorize(
    permission_code: str,
    request,
    *,
    resource: Optional[Any] = None,
    context: Optional[dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> AuthorizationDecision:
    """返回权限判定结果，不抛异常。

    适合菜单显隐、分支逻辑和“有权限则跳转编辑页”这类软判断。
    """
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
    """强制校验权限，失败时抛出业务异常。

    写操作、详情访问和资源级操作默认使用这个入口。
    """
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
    """任一权限通过即可返回允许结果。"""
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
    """强制校验一组权限，只要其中一个通过即可。"""
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
    """按当前用户权限范围过滤列表查询。

    业务列表不要手写“导师/团队/部门”过滤条件，统一通过模块
    `authorization.py` 注册的 scope handler 收敛。
    """
    return AuthorizationEngine(request).scope_filter(
        permission_code,
        resource_model=resource_model,
        base_queryset=base_queryset,
        context=context,
    )
