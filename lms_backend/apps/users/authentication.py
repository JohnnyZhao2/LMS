"""
Custom authentication helpers for user role awareness.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
class RoleAwareJWTAuthentication(JWTAuthentication):
    """
    Extends JWT authentication to attach the current_role claim to the user.
    This allows downstream permission checks (e.g., get_current_role) to
    respect the actively selected role that is stored inside the token.
    """
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        current_role = validated_token.get('current_role')
        if current_role:
            setattr(user, 'current_role', current_role)
        return user
