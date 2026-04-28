"""Authorization serializers."""

from collections.abc import Mapping

from rest_framework import serializers

from apps.users.models import Role

from .constants import (
    EFFECT_CHOICES,
    PERMISSION_CATALOG_BY_CODE,
    PERMISSION_CONSTRAINT_SUMMARIES,
    PERMISSION_ALLOWED_SCOPE_TYPES_MAP,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_CHOICES,
    SCOPE_EXPLICIT_USERS,
)
from .models import Permission, UserPermissionOverride, UserScopeGroupOverride


NON_STUDENT_ROLE_CHOICES = [item for item in Role.ROLE_CHOICES if item[0] != 'STUDENT']


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


class PermissionSerializer(serializers.ModelSerializer):
    constraint_summary = serializers.SerializerMethodField()
    scope_aware = serializers.SerializerMethodField()
    scope_group_key = serializers.SerializerMethodField()
    allowed_scope_types = serializers.SerializerMethodField()
    implies = serializers.SerializerMethodField()

    def get_constraint_summary(self, obj: Permission) -> str:
        return PERMISSION_CONSTRAINT_SUMMARIES.get(obj.code, '')

    def get_scope_aware(self, obj: Permission) -> bool:
        return obj.code in SCOPE_AWARE_PERMISSION_CODES

    def get_scope_group_key(self, obj: Permission):
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(obj.code)
        return catalog_item.get('scope_group_key') if catalog_item else None

    def get_allowed_scope_types(self, obj: Permission) -> list[str]:
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(obj.code)
        if not catalog_item or not catalog_item.get('scope_group_key'):
            return []
        return list(PERMISSION_ALLOWED_SCOPE_TYPES_MAP.get(obj.code, ()))

    def get_implies(self, obj: Permission) -> list[str]:
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(obj.code)
        return catalog_item.get('implies', []) if catalog_item else []

    class Meta:
        model = Permission
        fields = [
            'code',
            'name',
            'module',
            'description',
            'constraint_summary',
            'scope_aware',
            'scope_group_key',
            'allowed_scope_types',
            'implies',
            'is_active',
        ]


class RoleScopeGroupSerializer(serializers.Serializer):
    key = serializers.CharField()
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
    )
    default_scope_types = serializers.ListField(
        child=serializers.ChoiceField(choices=SCOPE_CHOICES),
        allow_empty=True,
    )


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
        allow_empty=True,
        help_text='该角色默认继承的数据范围',
    )
    scope_groups = RoleScopeGroupSerializer(many=True, help_text='按能力组聚合的默认范围')


class UserPermissionOverrideCreateSerializer(StrictSerializer):
    permission_code = serializers.CharField(help_text='权限编码')
    effect = serializers.ChoiceField(choices=EFFECT_CHOICES, help_text='覆盖效果')
    applies_to_role = serializers.ChoiceField(
        choices=NON_STUDENT_ROLE_CHOICES,
        required=False,
        allow_null=True,
        help_text='仅对某个激活角色生效（可选）',
    )
    reason = serializers.CharField(required=False, allow_blank=True, default='')
    expires_at = serializers.DateTimeField(required=False, allow_null=True)


class UserPermissionOverrideSerializer(serializers.ModelSerializer):
    permission_code = serializers.CharField(source='permission.code', read_only=True)
    permission_name = serializers.CharField(source='permission.name', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.username', read_only=True, allow_null=True)
    applies_to_role = serializers.SerializerMethodField()

    def get_applies_to_role(self, obj: UserPermissionOverride):
        return obj.applies_to_role or None

    class Meta:
        model = UserPermissionOverride
        fields = [
            'id',
            'permission_code',
            'permission_name',
            'effect',
            'applies_to_role',
            'reason',
            'expires_at',
            'granted_by_name',
            'created_at',
            'updated_at',
        ]


class UserScopeGroupOverrideCreateSerializer(StrictSerializer):
    scope_group_key = serializers.CharField(help_text='范围组键')
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


class UserScopeGroupOverrideSerializer(serializers.ModelSerializer):
    granted_by_name = serializers.CharField(source='granted_by.username', read_only=True, allow_null=True)

    class Meta:
        model = UserScopeGroupOverride
        fields = [
            'id',
            'scope_group_key',
            'effect',
            'applies_to_role',
            'scope_type',
            'scope_user_ids',
            'reason',
            'expires_at',
            'granted_by_name',
            'created_at',
            'updated_at',
        ]
