"""Unified authorization entry points."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any, Optional, Type

from django.db.models import Q, QuerySet

from apps.authorization.constants import (
    RESOURCE_AUTHORIZATION_HANDLERS,
    EFFECT_ALLOW,
    EFFECT_DENY,
    SCOPE_FILTER_HANDLERS,
    SCOPE_ALL,
    SCOPE_DEPARTMENT,
    SCOPE_EXPLICIT_USERS,
    SCOPE_MENTEES,
    SCOPE_SELF,
)
from apps.authorization.roles import LEARNING_POOL_EXCLUDED_ROLE_CODES
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .decisions import AuthorizationDecision
from .models import PermissionScopeRule
from .selectors import list_active_user_overrides
from .services import AuthorizationService


class AuthorizationEngine(BaseService):
    """Single entry for permission, scope and resource-constraint decisions."""

    REQUEST_CACHE_ATTR = '_authorization_engine_cache'

    def __init__(self, request):
        super().__init__(request)
        self._authorization_service = AuthorizationService(request)

    def _get_request_cache(self) -> dict[str, dict[Any, Any]]:
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is None:
            cache = {
                'base_permission_decisions': {},
                'resource_decisions': {},
                'scoped_user_ids': {},
                'default_scope_types': {},
            }
            setattr(self.request, self.REQUEST_CACHE_ATTR, cache)
        return cache

    def _get_cached_base_permission_decision(
        self,
        permission_code: str,
        error_message: Optional[str],
    ) -> Optional[AuthorizationDecision]:
        return self._get_request_cache()['base_permission_decisions'].get(
            (permission_code, error_message or ''),
        )

    def _set_cached_base_permission_decision(
        self,
        permission_code: str,
        error_message: Optional[str],
        decision: AuthorizationDecision,
    ) -> AuthorizationDecision:
        self._get_request_cache()['base_permission_decisions'][(permission_code, error_message or '')] = decision
        return decision

    def _get_resource_decision_cache_key(
        self,
        permission_code: str,
        resource: Optional[Any],
        context: dict[str, Any],
        error_message: Optional[str],
    ) -> Optional[tuple[Any, ...]]:
        frozen_context = self._freeze_cache_value(context)
        if resource is None:
            return ('__global__', permission_code, frozen_context, error_message or '')
        resource_id = getattr(resource, 'pk', None)
        if resource_id is None:
            return None
        return (resource.__class__.__name__, resource_id, permission_code, frozen_context, error_message or '')

    def _freeze_cache_value(self, value: Any) -> Any:
        if isinstance(value, Mapping):
            return tuple(
                sorted((key, self._freeze_cache_value(item)) for key, item in value.items())
            )
        if isinstance(value, set):
            return tuple(sorted(self._freeze_cache_value(item) for item in value))
        if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
            return tuple(self._freeze_cache_value(item) for item in value)
        resource_id = getattr(value, 'pk', None)
        if resource_id is not None:
            return (value.__class__.__name__, resource_id)
        return value

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

        if not self._authorization_service._is_permission_granted(permission_code):
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

    def base_permission_decision(
        self,
        permission_code: str,
        *,
        error_message: Optional[str] = None,
    ) -> AuthorizationDecision:
        cached_decision = self._get_cached_base_permission_decision(permission_code, error_message)
        if cached_decision is not None:
            return cached_decision

        if self._authorization_service._is_permission_granted(permission_code):
            decision = AuthorizationDecision.allow(permission_code)
        else:
            decision = AuthorizationDecision.deny(
                permission_code,
                message=error_message or f'缺少权限: {permission_code}',
                reason='permission_denied',
            )
        return self._set_cached_base_permission_decision(permission_code, error_message, decision)

    def has_allow_override(self, permission_code: str) -> bool:
        return self._authorization_service.has_allow_override(permission_code)

    def get_scoped_learning_members(self, permission_code: str) -> QuerySet:
        return self.get_scoped_user_queryset(
            permission_code,
            self._learning_member_queryset(),
            cache_key='learning_members',
        )

    def get_scoped_user_queryset(
        self,
        permission_code: str,
        user_queryset: QuerySet,
        *,
        cache_key: Optional[str] = None,
    ) -> QuerySet:
        scoped_queryset = user_queryset
        if not self.user or not getattr(self.user, 'is_authenticated', False):
            return scoped_queryset.none()
        if getattr(self.user, 'is_superuser', False):
            return scoped_queryset

        if cache_key:
            cached_ids = self._get_request_cache()['scoped_user_ids'].get((permission_code, cache_key))
            if cached_ids is not None:
                if not cached_ids:
                    return scoped_queryset.none()
                return scoped_queryset.filter(id__in=cached_ids).distinct()

        current_role = self.get_current_role()
        if not current_role:
            return scoped_queryset.none()

        default_scope_types = self._get_default_scope_types(permission_code, current_role)
        allow_ids = self._resolve_scope_ids(
            scope_types=default_scope_types,
            user_queryset=scoped_queryset,
        )
        deny_ids: set[int] = set()

        overrides = list_active_user_overrides(
            user_id=self.user.id,
            current_role=current_role,
            permission_code=permission_code,
        )
        for override in overrides:
            scope_ids = self._resolve_single_scope_ids(
                scope_type=override.scope_type,
                scope_user_ids=override.scope_user_ids or [],
                user_queryset=scoped_queryset,
            )
            if override.effect == EFFECT_DENY:
                deny_ids.update(scope_ids)
            elif override.effect == EFFECT_ALLOW:
                allow_ids.update(scope_ids)

        final_ids = allow_ids - deny_ids
        if cache_key:
            self._get_request_cache()['scoped_user_ids'][(permission_code, cache_key)] = final_ids
        if not final_ids:
            return scoped_queryset.none()
        return scoped_queryset.filter(id__in=final_ids).distinct()

    def _learning_member_queryset(self) -> QuerySet:
        excluded_ids = User.objects.filter(
            Q(is_superuser=True) | Q(roles__code__in=LEARNING_POOL_EXCLUDED_ROLE_CODES),
        ).values_list('id', flat=True)
        return User.objects.filter(
            is_active=True,
            roles__code='STUDENT',
        ).exclude(
            id__in=excluded_ids,
        ).distinct()

    def _get_default_scope_types(self, permission_code: str, role_code: str) -> list[str]:
        cache_key = (permission_code, role_code)
        cached_scope_types = self._get_request_cache()['default_scope_types'].get(cache_key)
        if cached_scope_types is not None:
            return list(cached_scope_types)

        scope_types = list(
            PermissionScopeRule.objects.filter(
                permission__code=permission_code,
                role_code=role_code,
                is_active=True,
            ).values_list('scope_type', flat=True)
        )
        self._get_request_cache()['default_scope_types'][cache_key] = tuple(scope_types)
        return scope_types

    def _resolve_scope_ids(
        self,
        *,
        scope_types: list[str],
        user_queryset: QuerySet,
    ) -> set[int]:
        resolved_ids: set[int] = set()
        for scope_type in scope_types:
            resolved_ids.update(
                self._resolve_single_scope_ids(
                    scope_type=scope_type,
                    scope_user_ids=[],
                    user_queryset=user_queryset,
                )
            )
        return resolved_ids

    def _resolve_single_scope_ids(
        self,
        *,
        scope_type: str,
        scope_user_ids: list[int],
        user_queryset: QuerySet,
    ) -> set[int]:
        if scope_type == SCOPE_ALL:
            return set(user_queryset.values_list('id', flat=True))
        if scope_type == SCOPE_SELF:
            return set(
                user_queryset.filter(pk=getattr(self.user, 'id', None)).values_list('id', flat=True)
            )
        if scope_type == SCOPE_MENTEES:
            return set(
                user_queryset.filter(mentor=self.user).values_list('id', flat=True)
            )
        if scope_type == SCOPE_DEPARTMENT:
            if not getattr(self.user, 'department_id', None):
                return set()
            return set(
                user_queryset.filter(department_id=self.user.department_id).exclude(
                    pk=getattr(self.user, 'id', None),
                ).values_list('id', flat=True)
            )
        if scope_type == SCOPE_EXPLICIT_USERS:
            if not scope_user_ids:
                return set()
            return set(
                user_queryset.filter(id__in=scope_user_ids).values_list('id', flat=True)
            )
        return set()


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
