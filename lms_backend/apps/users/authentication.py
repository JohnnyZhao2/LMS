"""
Custom authentication helpers for user role awareness.
"""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.authorization.roles import resolve_current_role


class RoleAwareJWTAuthentication(JWTAuthentication):
    """
    Extends JWT authentication to attach the current_role claim to the user.
    This allows downstream permission checks (e.g., get_current_role) to
    respect the actively selected role that is stored inside the token.
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if not user.is_active:
            raise AuthenticationFailed('用户账号已被停用')

        setattr(
            user,
            'current_role',
            resolve_current_role(user, requested_role=validated_token.get('current_role')),
        )
        return user
