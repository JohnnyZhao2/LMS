"""
Custom authentication helpers for user role awareness.
"""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.authorization.roles import SUPER_ADMIN_ROLE, get_default_role, is_super_admin


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

        if is_super_admin(user):
            setattr(user, 'current_role', SUPER_ADMIN_ROLE)
            return user

        role_codes = set(user.role_codes)
        current_role = validated_token.get('current_role')
        if current_role and current_role in role_codes:
            setattr(user, 'current_role', current_role)
        else:
            setattr(user, 'current_role', get_default_role(role_codes))
        return user
