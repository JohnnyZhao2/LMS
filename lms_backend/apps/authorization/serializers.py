from rest_framework import serializers

from .constants import PERMISSION_CONSTRAINT_SUMMARIES
from .models import Permission


class PermissionSerializer(serializers.ModelSerializer):
    constraint_summary = serializers.SerializerMethodField()

    def get_constraint_summary(self, obj: Permission) -> str:
        return PERMISSION_CONSTRAINT_SUMMARIES.get(obj.code, '')

    class Meta:
        model = Permission
        fields = [
            'code',
            'name',
            'module',
            'description',
            'constraint_summary',
            'is_active',
        ]


class UserPermissionsSerializer(serializers.Serializer):
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )
