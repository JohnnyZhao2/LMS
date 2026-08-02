"""
Serializers for authentication.
"""
from rest_framework import serializers

from apps.users.models import Role
from apps.users.serializers import RoleSerializer, UserInfoSerializer

PASSWORD_MIN_LENGTH = 6


def password_field(**kwargs):
    """统一密码字段规则。"""
    return serializers.CharField(
        required=True,
        write_only=True,
        min_length=PASSWORD_MIN_LENGTH,
        help_text='新密码',
        **kwargs,
    )


class LoginRequestSerializer(serializers.Serializer):
    employee_id = serializers.CharField(required=True, help_text='工号')
    password = serializers.CharField(required=True, write_only=True, help_text='密码')


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
    """登录/切角色/改密后的完整会话响应。"""


class RefreshTokenSerializer(serializers.Serializer):
    """登出与刷新令牌共用。"""
    refresh_token = serializers.CharField(required=True, help_text='刷新令牌')


class SwitchRoleRequestSerializer(serializers.Serializer):
    role_code = serializers.ChoiceField(
        choices=Role.ROLE_CHOICES,
        required=True,
        help_text='要切换到的角色代码',
    )


class ChangePasswordRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True, help_text='要修改密码的用户ID')
    password = password_field()


class ChangeMyPasswordRequestSerializer(serializers.Serializer):
    current_password = serializers.CharField(
        required=True,
        write_only=True,
        help_text='当前密码',
    )
    password = password_field()


class OneAccountAuthorizeUrlResponseSerializer(serializers.Serializer):
    authorize_url = serializers.CharField(help_text='统一认证授权跳转地址')


class OneAccountCodeLoginRequestSerializer(serializers.Serializer):
    code = serializers.CharField(required=True, help_text='统一认证回调授权码')
