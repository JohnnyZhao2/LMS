"""Cache utilities for LMS backend."""
from django.core.cache import cache
from typing import Optional, Callable, Any
import hashlib
import json


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """Generate a consistent cache key from arguments."""
    key_parts = [prefix]

    # Add positional arguments
    for arg in args:
        key_parts.append(str(arg))

    # Add keyword arguments (sorted for consistency)
    for k, v in sorted(kwargs.items()):
        key_parts.append(f"{k}:{v}")

    key_string = ":".join(key_parts)

    # Hash if too long
    if len(key_string) > 200:
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        return f"{prefix}:{key_hash}"

    return key_string


def cached_query(cache_key: str, timeout: int = 300):
    """Decorator for caching query results."""
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> Any:
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result

            # Execute query
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, timeout)

            return result
        return wrapper
    return decorator


def invalidate_cache(pattern: str) -> int:
    """Invalidate cache keys matching pattern."""
    from django_redis import get_redis_connection

    conn = get_redis_connection("default")
    keys = conn.keys(f"lms:{pattern}*")

    if keys:
        return conn.delete(*keys)
    return 0
