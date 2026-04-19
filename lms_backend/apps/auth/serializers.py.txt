"""
Serializers for authentication.
"""
from rest_framework import serializers

from apps.users.models import Role
from apps.users.serializers import RoleSerializer, UserInfoSerializer


class LoginRequestSerializer(serializers.Serializer):
    """
    Serializer for login request.
    """
    employee_id = serializers.CharField(
        required=True,
        help_text='工号'
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        help_text='密码'
    )


class AuthSessionSerializer(serializers.Serializer):
    """Shared session payload for authenticated responses."""
    user = UserInfoSerializer(help_text='用户信息')
    available_roles = RoleSerializer(many=True, help_text='可用角色列表')
    current_role = serializers.CharField(help_text='当前生效角色')
    capabilities = serializers.DictField(
        child=serializers.DictField(),
        help_text='当前生效角色下的能力映射',
    )


class TokenPairSerializer(serializers.Serializer):
    access_token = serializers.CharField(help_text='访问令牌')
    refresh_token = serializers.CharField(help_text='刷新令牌')


class LoginResponseSerializer(AuthSessionSerializer, TokenPairSerializer):
    """
    Serializer for login response.
    """


class LogoutRequestSerializer(serializers.Serializer):
    """Serializer for logout request."""
    refresh_token = serializers.CharField(
        required=False,
        help_text='刷新令牌（可选，用于黑名单）'
    )


class RefreshTokenRequestSerializer(serializers.Serializer):
    """Serializer for token refresh request."""
    refresh_token = serializers.CharField(
        required=True,
        help_text='刷新令牌'
    )


class RefreshTokenResponseSerializer(TokenPairSerializer):
    """Serializer for token refresh response."""


class SwitchRoleRequestSerializer(serializers.Serializer):
    """
    Serializer for role switch request.
    """
    role_code = serializers.ChoiceField(
        choices=Role.ROLE_CHOICES,
        required=True,
        help_text='要切换到的角色代码'
    )

class ResetPasswordRequestSerializer(serializers.Serializer):
    """
    Serializer for password reset request (admin only).
    """
    user_id = serializers.IntegerField(
        required=True,
        help_text='要重置密码的用户ID'
    )


class ResetPasswordResponseSerializer(serializers.Serializer):
    """
    Serializer for password reset response.
    """
    temporary_password = serializers.CharField(help_text='临时密码')


class OidcAuthorizeUrlResponseSerializer(serializers.Serializer):
    authorize_url = serializers.CharField(help_text='统一认证授权跳转地址')
    state = serializers.CharField(help_text='防重放随机值')


class OidcCodeLoginRequestSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, help_text='统一认证回调授权码')
