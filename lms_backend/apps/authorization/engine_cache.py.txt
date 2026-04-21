from collections.abc import Mapping, Sequence
from typing import Any, Optional

from .decisions import AuthorizationDecision


class AuthorizationEngineCacheMixin:
    REQUEST_CACHE_ATTR = '_authorization_engine_cache'

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
        return self._get_request_cache()['base_permission_decisions'].get((permission_code, error_message or ''))

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
            return tuple(sorted((key, self._freeze_cache_value(item)) for key, item in value.items()))
        if isinstance(value, set):
            return tuple(sorted(self._freeze_cache_value(item) for item in value))
        if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
            return tuple(self._freeze_cache_value(item) for item in value)
        resource_id = getattr(value, 'pk', None)
        if resource_id is not None:
            return (value.__class__.__name__, resource_id)
        return value
