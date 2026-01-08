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


class LoginResponseSerializer(serializers.Serializer):
    """
    Serializer for login response.
    """
    access_token = serializers.CharField(help_text='访问令牌')
    refresh_token = serializers.CharField(help_text='刷新令牌')
    user = UserInfoSerializer(help_text='用户信息')
    available_roles = RoleSerializer(many=True, help_text='可用角色列表')
    current_role = serializers.CharField(help_text='当前生效角色')


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


class RefreshTokenResponseSerializer(serializers.Serializer):
    """Serializer for token refresh response."""
    access_token = serializers.CharField(help_text='新的访问令牌')
    refresh_token = serializers.CharField(help_text='新的刷新令牌')


class SwitchRoleRequestSerializer(serializers.Serializer):
    """
    Serializer for role switch request.
    """
    role_code = serializers.ChoiceField(
        choices=[
            ('STUDENT', '学员'),
            ('MENTOR', '导师'),
            ('DEPT_MANAGER', '室经理'),
            ('ADMIN', '管理员'),
            ('TEAM_MANAGER', '团队经理'),
        ],
        required=True,
        help_text='要切换到的角色代码'
    )


class SwitchRoleResponseSerializer(serializers.Serializer):
    """
    Serializer for role switch response.
    """
    access_token = serializers.CharField(help_text='新的访问令牌')
    refresh_token = serializers.CharField(help_text='新的刷新令牌')
    user = UserInfoSerializer(help_text='用户信息')
    available_roles = RoleSerializer(many=True, help_text='可用角色列表')
    current_role = serializers.CharField(help_text='当前生效角色')


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
    message = serializers.CharField(help_text='提示信息')
