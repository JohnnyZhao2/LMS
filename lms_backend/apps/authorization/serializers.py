"""Authorization serializers."""

from collections.abc import Mapping

from rest_framework import serializers

from apps.users.models import Role

from .constants import (
    PERMISSION_CATALOG_BY_CODE,
    PERMISSION_CONSTRAINT_SUMMARIES,
    PERMISSION_ALLOWED_SCOPE_TYPES_MAP,
    SCOPE_AWARE_PERMISSION_CODES,
    SCOPE_CHOICES,
)
from .models import Permission


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
    scope_kind = serializers.SerializerMethodField()
    scope_group_key = serializers.SerializerMethodField()
    allowed_scope_types = serializers.SerializerMethodField()
    required_role_codes = serializers.SerializerMethodField()
    implies = serializers.SerializerMethodField()

    def get_constraint_summary(self, obj: Permission) -> str:
        return PERMISSION_CONSTRAINT_SUMMARIES.get(obj.code, '')

    def get_scope_aware(self, obj: Permission) -> bool:
        return obj.code in SCOPE_AWARE_PERMISSION_CODES

    def get_scope_kind(self, obj: Permission) -> str:
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(obj.code)
        return catalog_item.get('scope_kind', 'NONE') if catalog_item else 'NONE'

    def get_scope_group_key(self, obj: Permission):
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(obj.code)
        return catalog_item.get('scope_group_key') if catalog_item else None

    def get_allowed_scope_types(self, obj: Permission) -> list[str]:
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(obj.code)
        if not catalog_item or not catalog_item.get('scope_group_key'):
            return []
        return list(PERMISSION_ALLOWED_SCOPE_TYPES_MAP.get(obj.code, ()))

    def get_required_role_codes(self, obj: Permission) -> list[str]:
        catalog_item = PERMISSION_CATALOG_BY_CODE.get(obj.code)
        return list(catalog_item.get('required_role_codes') or []) if catalog_item else []

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
            'scope_kind',
            'scope_group_key',
            'allowed_scope_types',
            'is_configurable',
            'required_role_codes',
            'implies',
            'is_active',
        ]


class AuthorizationScopeSerializer(StrictSerializer):
    scope_group_key = serializers.CharField()
    scope_type = serializers.ChoiceField(choices=SCOPE_CHOICES)
    target_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )

    def validate(self, attrs):
        # 领域规则（EXPLICIT 非空 / 非 EXPLICIT 禁成员等）由 service 校验
        attrs['target_user_ids'] = sorted(
            {int(uid) for uid in (attrs.get('target_user_ids') or [])}
        )
        return attrs


class RoleTemplateSerializer(StrictSerializer):
    role_code = serializers.ChoiceField(choices=Role.ROLE_CHOICES)
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )
    scopes = AuthorizationScopeSerializer(many=True, required=False)


class UserAuthorizationSerializer(StrictSerializer):
    role_code = serializers.ChoiceField(choices=Role.ROLE_CHOICES, required=False)
    permission_codes = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=True,
    )
    scopes = AuthorizationScopeSerializer(many=True, required=False)
