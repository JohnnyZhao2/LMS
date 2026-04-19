from typing import Optional

from .selectors import list_active_scope_group_overrides, list_active_user_overrides


class AuthorizationPolicyCacheMixin:
    REQUEST_CACHE_ATTR = '_authorization_service_cache'

    def _get_request_cache(self) -> dict[str, dict]:
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is None:
            cache = {
                'user_overrides': {},
                'scope_group_overrides': {},
            }
            setattr(self.request, self.REQUEST_CACHE_ATTR, cache)
        return cache

    def _list_active_user_overrides_cached(
        self,
        *,
        user_id: int,
        current_role: Optional[str],
        permission_code: Optional[str] = None,
    ):
        cache_key = (user_id, current_role or '', permission_code or '')
        cache = self._get_request_cache()['user_overrides']
        if cache_key not in cache:
            cache[cache_key] = list_active_user_overrides(
                user_id=user_id,
                current_role=current_role,
                permission_code=permission_code,
            )
        return cache[cache_key]

    def _list_active_scope_group_overrides_cached(
        self,
        *,
        user_id: int,
        current_role: Optional[str],
        scope_group_key: Optional[str] = None,
    ):
        cache_key = (user_id, current_role or '', scope_group_key or '')
        cache = self._get_request_cache()['scope_group_overrides']
        if cache_key not in cache:
            cache[cache_key] = list_active_scope_group_overrides(
                user_id=user_id,
                current_role=current_role,
                scope_group_key=scope_group_key,
            )
        return cache[cache_key]
