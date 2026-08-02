from __future__ import annotations

from rest_framework import serializers

from .models import ActivityLog, ActivityLogPolicy


LOG_TYPE_CHOICES = (
    ('user', '账号'),
    ('content', '内容'),
    ('operation', '行为记录'),
)


class SimpleUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    username = serializers.CharField(read_only=True)
    avatar_key = serializers.CharField(read_only=True, allow_blank=True, allow_null=True)
    department_name = serializers.CharField(read_only=True, allow_null=True)
    department_code = serializers.CharField(read_only=True, allow_null=True)


class ActivityLogItemSerializer(serializers.ModelSerializer):
    actor = serializers.SerializerMethodField()

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'category',
            'actor',
            'action',
            'status',
            'summary',
            'description',
            'created_at',
        ]

    def get_actor(self, obj: ActivityLog) -> dict | None:
        actor = obj.actor
        if actor is None:
            return None
        department = getattr(actor, 'department', None)
        return {
            'id': actor.id,
            'employee_id': actor.employee_id,
            'username': actor.username,
            'avatar_key': actor.avatar_key,
            'department_name': getattr(department, 'name', None),
            'department_code': getattr(department, 'code', None),
        }


class ActivityLogMemberSerializer(serializers.Serializer):
    user = SimpleUserSerializer()
    activity_count = serializers.IntegerField()
    last_activity_at = serializers.DateTimeField()


class ActivityLogListDataSerializer(serializers.Serializer):
    members = ActivityLogMemberSerializer(many=True)
    results = ActivityLogItemSerializer(many=True)
    count = serializers.IntegerField()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()


class ActivityLogQuerySerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=LOG_TYPE_CHOICES)
    member_ids = serializers.CharField(required=False, allow_blank=True)
    search = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    action = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    status = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    page = serializers.IntegerField(required=False, default=1, min_value=1)
    page_size = serializers.IntegerField(required=False, default=10, min_value=1, max_value=100)

    def validate_member_ids(self, value: str) -> list[int]:
        if not value:
            return []

        raw_items = [item.strip() for item in value.split(',') if item.strip()]
        try:
            return [int(item) for item in raw_items]
        except ValueError as exc:
            raise serializers.ValidationError('member_ids 必须是逗号分隔的整数列表') from exc

    def validate(self, attrs):
        if attrs.get('date_from') and attrs.get('date_to') and attrs['date_from'] > attrs['date_to']:
            raise serializers.ValidationError('date_from 不能晚于 date_to')
        return attrs


class ActivityLogPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLogPolicy
        fields = [
            'id',
            'key',
            'category',
            'group',
            'label',
            'enabled',
            'updated_at',
        ]


class ActivityLogPolicyUpdateSerializer(serializers.Serializer):
    key = serializers.CharField()
    enabled = serializers.BooleanField()
