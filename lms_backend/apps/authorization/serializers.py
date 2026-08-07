"""Authorization serializers."""

from collections.abc import Mapping

from rest_framework import serializers

class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, Mapping):
            unknown_fields = sorted(set(data) - set(self.fields))
            if unknown_fields:
                raise serializers.ValidationError({
                    field: '不支持的字段'
                    for field in unknown_fields
                })
        return super().to_internal_value(data)


class PermissionSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    module = serializers.CharField()
    implies = serializers.ListField(child=serializers.CharField())
    is_active = serializers.BooleanField()



class UserPermissionReplaceSerializer(StrictSerializer):
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
        help_text='用户最终权限编码列表',
    )


class UserPermissionSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    permission_codes = serializers.ListField(child=serializers.CharField())
    inherited_permission_codes = serializers.ListField(child=serializers.CharField())


class GroupPermissionSerializer(serializers.Serializer):
    role_code = serializers.CharField()
    permission_codes = serializers.ListField(child=serializers.CharField())
