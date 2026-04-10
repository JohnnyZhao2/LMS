"""
Custom throttle classes for API rate limiting.
"""
from rest_framework.throttling import AnonRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Throttle for authentication endpoints (login, token refresh)."""
    scope = 'auth'
