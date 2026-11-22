"""Authorization serializers."""

from rest_framework import serializers

from apps.authorization.models import DataScope


class PermissionSerializer(serializers.Serializer):
    code = serializers.CharField()
    name = serializers.CharField()
    module = serializers.CharField()
    implies = serializers.ListField(child=serializers.CharField())


class RoleItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    code = serializers.CharField()
    name = serializers.CharField()
    data_scope = serializers.ChoiceField(choices=DataScope.choices)
    department_ids = serializers.ListField(child=serializers.IntegerField())
    is_builtin = serializers.BooleanField()
    is_active = serializers.BooleanField()
    permission_codes = serializers.ListField(child=serializers.CharField())


class RoleCreateSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, max_length=64)
    data_scope = serializers.ChoiceField(choices=DataScope.choices, default=DataScope.SELF)
    department_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
    )
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
    )


class RoleUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=64)
    data_scope = serializers.ChoiceField(choices=DataScope.choices, required=False)
    department_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
    )
    is_active = serializers.BooleanField(required=False)
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
    )
