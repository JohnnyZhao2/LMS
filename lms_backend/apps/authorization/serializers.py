"""Authorization serializers."""

from rest_framework import serializers

from apps.users.models import Role

from .constants import EFFECT_CHOICES, SCOPE_CHOICES, SCOPE_EXPLICIT_USERS, VISIBLE_SCOPE_CHOICES
from .models import Permission, UserPermissionOverride
from .policies import (
    get_permission_constraint_summary,
    is_permission_visible_in_role_template,
)


NON_STUDENT_ROLE_CHOICES = [item for item in Role.ROLE_CHOICES if item[0] != 'STUDENT']


class PermissionSerializer(serializers.ModelSerializer):
    constraint_summary = serializers.SerializerMethodField()
    role_template_visible = serializers.SerializerMethodField()

    def get_constraint_summary(self, obj: Permission) -> str:
        return get_permission_constraint_summary(obj.code)

    def get_role_template_visible(self, obj: Permission) -> bool:
        return is_permission_visible_in_role_template(obj.code)

    class Meta:
        model = Permission
        fields = [
            'code',
            'name',
            'module',
            'description',
            'constraint_summary',
            'role_template_visible',
            'is_active',
        ]


class ScopeOptionSerializer(serializers.Serializer):
    code = serializers.ChoiceField(choices=VISIBLE_SCOPE_CHOICES)
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
        child=serializers.ChoiceField(choices=VISIBLE_SCOPE_CHOICES),
        allow_empty=True,
        help_text='该角色默认继承的数据范围',
    )
    scope_options = ScopeOptionSerializer(many=True, help_text='当前角色可选的数据范围')


class UserPermissionOverrideCreateSerializer(serializers.Serializer):
    permission_code = serializers.CharField(help_text='权限编码')
    effect = serializers.ChoiceField(choices=EFFECT_CHOICES, help_text='覆盖效果')
    applies_to_role = serializers.ChoiceField(
        choices=NON_STUDENT_ROLE_CHOICES,
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

    def validate(self, attrs):
        scope_type = attrs.get('scope_type')
        scope_user_ids = attrs.get('scope_user_ids') or []
        normalized_scope_user_ids = sorted({int(user_id) for user_id in scope_user_ids})

        if scope_type == SCOPE_EXPLICIT_USERS and not normalized_scope_user_ids:
            raise serializers.ValidationError({'scope_user_ids': '指定用户范围必须至少选择一个用户'})

        if scope_type != SCOPE_EXPLICIT_USERS and normalized_scope_user_ids:
            raise serializers.ValidationError({'scope_user_ids': '仅当范围为指定用户时才允许传 scope_user_ids'})

        attrs['scope_user_ids'] = normalized_scope_user_ids
        return attrs


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
