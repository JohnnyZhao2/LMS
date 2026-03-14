"""Authorization serializers."""

from rest_framework import serializers

from apps.users.models import Role

from .constants import EFFECT_CHOICES, SCOPE_CHOICES
from .models import Permission, UserPermissionOverride


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['code', 'name', 'module', 'description', 'is_active']


class ScopeOptionSerializer(serializers.Serializer):
    code = serializers.ChoiceField(choices=SCOPE_CHOICES)
    label = serializers.CharField()
    description = serializers.CharField()
    inherited_by_default = serializers.BooleanField()


class RolePermissionSerializer(serializers.Serializer):
    role_code = serializers.ChoiceField(choices=Role.ROLE_CHOICES)
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
        help_text='角色权限编码列表',
    )


class RolePermissionTemplateSerializer(RolePermissionSerializer):
    default_scope_types = serializers.ListField(
        child=serializers.ChoiceField(choices=SCOPE_CHOICES),
        allow_empty=False,
        help_text='该角色默认继承的数据范围',
    )
    scope_options = ScopeOptionSerializer(many=True, help_text='当前角色可选的数据范围')


class UserPermissionOverrideCreateSerializer(serializers.Serializer):
    permission_code = serializers.CharField(help_text='权限编码')
    effect = serializers.ChoiceField(choices=EFFECT_CHOICES, help_text='覆盖效果')
    applies_to_role = serializers.ChoiceField(
        choices=Role.ROLE_CHOICES,
        required=False,
        allow_null=True,
        help_text='仅对某个激活角色生效（可选）',
    )
    scope_type = serializers.ChoiceField(choices=SCOPE_CHOICES, help_text='覆盖范围')
    scope_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        help_text='指定用户ID列表（scope_type=EXPLICIT_USERS 时使用）',
    )
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


class UserPermissionOverrideSerializer(serializers.ModelSerializer):
    permission_code = serializers.CharField(source='permission.code', read_only=True)
    permission_name = serializers.CharField(source='permission.name', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.username', read_only=True, allow_null=True)
    revoked_by_name = serializers.CharField(source='revoked_by.username', read_only=True, allow_null=True)

    class Meta:
        model = UserPermissionOverride
        fields = [
            'id',
            'permission_code',
            'permission_name',
            'effect',
            'applies_to_role',
            'scope_type',
            'scope_user_ids',
            'reason',
            'expires_at',
            'is_active',
            'granted_by_name',
            'revoked_by_name',
            'revoked_at',
            'revoked_reason',
            'created_at',
            'updated_at',
        ]


class RevokeUserPermissionOverrideSerializer(serializers.Serializer):
    revoke_reason = serializers.CharField(required=False, allow_blank=True, default='')
