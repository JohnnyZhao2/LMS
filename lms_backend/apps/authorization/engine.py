"""Unified authorization entry points."""

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
    """Single entry for permission, scope and resource decisions."""

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
