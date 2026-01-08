"""
Custom authentication helpers for user role awareness.
"""
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
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
        role_codes = set(user.role_codes)
        current_role = validated_token.get('current_role')
        if current_role and current_role in role_codes:
            setattr(user, 'current_role', current_role)
        else:
            # Fall back to default role if token role is missing or stale.
            from .models import Role
            for role_code in Role.ROLE_PRIORITY_ORDER:
                if role_code in role_codes:
                    setattr(user, 'current_role', role_code)
                    break
        return user
