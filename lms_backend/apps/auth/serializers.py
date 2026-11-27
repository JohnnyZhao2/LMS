"""
Serializers for authentication.
"""
from rest_framework import serializers

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


class ImpersonatorSerializer(serializers.Serializer):
    id = serializers.IntegerField(help_text='超管用户ID')
    username = serializers.CharField(help_text='超管姓名')
    employee_id = serializers.CharField(help_text='超管工号')


class AuthSessionSerializer(serializers.Serializer):
    """Shared session payload for authenticated responses."""
    user = UserInfoSerializer(help_text='用户信息')
    roles = RoleSerializer(many=True, help_text='管理角色列表，普通员工为空')
    capabilities = serializers.ListField(
        child=serializers.CharField(),
        help_text='当前已授权的 Django 权限码列表',
    )
    impersonator = ImpersonatorSerializer(
        allow_null=True,
        required=False,
        help_text='当前视角扮演发起人（仅超管扮演态返回）',
    )


class ImpersonateRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True, help_text='目标用户ID')


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
        required=True,
        help_text='刷新令牌'
    )


class RefreshTokenRequestSerializer(serializers.Serializer):
    """Serializer for token refresh request."""
    refresh_token = serializers.CharField(
        required=True,
        help_text='刷新令牌'
    )


class RefreshTokenResponseSerializer(TokenPairSerializer):
    """Serializer for token refresh response."""


class ChangePasswordRequestSerializer(serializers.Serializer):
    """
    Serializer for password change request (admin only).
    """
    user_id = serializers.IntegerField(
        required=True,
        help_text='要修改密码的用户ID'
    )
    password = serializers.CharField(required=True, write_only=True, help_text='新密码')


class ChangeMyPasswordRequestSerializer(serializers.Serializer):
    """
    Serializer for current user password change request.
    """
    current_password = serializers.CharField(required=True, write_only=True, help_text='当前密码')
    password = serializers.CharField(required=True, write_only=True, min_length=6, help_text='新密码')


class OneAccountAuthorizeUrlResponseSerializer(serializers.Serializer):
    authorize_url = serializers.CharField(help_text='统一认证授权跳转地址')


class OneAccountCodeLoginRequestSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, help_text='统一认证回调授权码')
