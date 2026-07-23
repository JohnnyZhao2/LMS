"""最终授权请求级缓存。"""


class AuthorizationPolicyCacheMixin:
    """缓存最终权限集合与最终范围。"""

    REQUEST_CACHE_ATTR = '_authorization_service_cache'

    def _get_request_cache(self) -> dict:
        """返回当前 request 共享的权限缓存容器。"""
        cache = getattr(self.request, self.REQUEST_CACHE_ATTR, None)
        if cache is None:
            cache = {
                'final_permission_codes': {},
                'final_scopes': {},
            }
            setattr(self.request, self.REQUEST_CACHE_ATTR, cache)
        return cache
