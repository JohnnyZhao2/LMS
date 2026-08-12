"""Authorization serializers."""

from rest_framework import serializers


class PermissionSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    module = serializers.CharField()
    implies = serializers.ListField(child=serializers.CharField())


class PermissionCodesSerializer(serializers.Serializer):
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
        help_text='用户期望的最终权限列表（角色基础 + 个人额外）',
    )


class UserPermissionSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    permission_codes = serializers.ListField(child=serializers.CharField())
    base_permission_codes = serializers.ListField(
        child=serializers.CharField(),
        help_text='当前管理角色 Group 基础权限（权限下限，不可关闭）',
    )


class GroupPermissionSerializer(serializers.Serializer):
    role_code = serializers.CharField()
    permission_codes = serializers.ListField(child=serializers.CharField())
