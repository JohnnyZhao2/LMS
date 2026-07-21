"""资源级权限判定。

能力开关只回答“用户有没有这个权限点”。资源级判定会继续检查“能否操作这
一个对象”，例如只能编辑自己创建的任务、只能看自己范围内的学员等。
"""

from collections.abc import Sequence
from typing import Any, Optional

from core.exceptions import BusinessError, ErrorCodes

from .constants import RESOURCE_AUTHORIZATION_HANDLERS
from .decisions import AuthorizationDecision


class ResourcePolicyEngineMixin:
    """把 permission code 分派到各模块注册的资源约束处理器。"""

    def authorize(
        self,
        permission_code: str,
        *,
        resource: Optional[Any] = None,
        context: Optional[dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        context = context or {}
        decision_cache_key = self._get_resource_decision_cache_key(
            permission_code,
            resource,
            context,
            error_message,
        )
        if decision_cache_key is not None:
            cached_decision = self._get_request_cache()['resource_decisions'].get(decision_cache_key)
            if cached_decision is not None:
                return cached_decision

        decision = None
        # 优先执行模块声明的资源级约束；未声明约束的权限退回纯能力开关。
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
                break
        if decision is None:
            decision = self.base_permission_decision(permission_code, error_message=error_message)

        if decision_cache_key is not None:
            self._get_request_cache()['resource_decisions'][decision_cache_key] = decision
        return decision

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

    def base_permission_decision(
        self,
        permission_code: str,
        *,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        cached_decision = self._get_cached_base_permission_decision(permission_code, error_message)
        if cached_decision is not None:
            return cached_decision

        # 这里不做资源判断，只看角色模板和用户级 allow/deny 覆盖后的能力结果。
        if self._authorization_service.is_capability_granted(permission_code):
            decision = AuthorizationDecision.allow(permission_code)
        else:
            decision = AuthorizationDecision.deny(
                permission_code,
                message=error_message or f'缺少权限: {permission_code}',
                reason='permission_denied',
            )
        return self._set_cached_base_permission_decision(permission_code, error_message, decision)
