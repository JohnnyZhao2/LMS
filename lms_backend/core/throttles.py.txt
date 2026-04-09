"""
Custom throttle classes for API rate limiting.
"""
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthThrottle(AnonRateThrottle):
    """Throttle for authentication endpoints (login, token refresh)."""
    scope = 'auth'


class SubmissionThrottle(UserRateThrottle):
    """Throttle for submission endpoints."""
    scope = 'submission'


class BurstRateThrottle(UserRateThrottle):
    """Throttle for burst protection (short time window)."""
    scope = 'burst'
