from rest_framework import serializers

from .models import ActivityLogPolicy


LOG_TYPE_CHOICES = (
    ('user', '账号'),
    ('content', '内容'),
    ('operation', '行为记录'),
)


class SimpleUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    username = serializers.CharField(read_only=True)


class ActivityLogTargetSerializer(serializers.Serializer):
    type = serializers.CharField()
    id = serializers.CharField(required=False)
    title = serializers.CharField()


class ActivityLogItemSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    actor = serializers.SerializerMethodField()
    action = serializers.CharField()
    status = serializers.CharField()
    description = serializers.CharField()
    created_at = serializers.DateTimeField()
    target = serializers.SerializerMethodField()

    def get_id(self, obj):
        return f"{self.context['log_type']}-{obj.id}"

    def get_category(self, obj):
        return self.context['log_type']

    def get_actor(self, obj):
        actor = obj.user if self.context['log_type'] == 'user' else obj.operator
        if actor is None:
            return None
        return SimpleUserSerializer(actor).data

    def get_target(self, obj):
        log_type = self.context['log_type']
        if log_type == 'content':
            return {
                'type': obj.content_type,
                'id': obj.content_id,
                'title': obj.content_title,
            }
        if log_type == 'operation':
            return {
                'type': obj.operation_type,
                'title': obj.get_operation_type_display(),
            }
        return None


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
    page_size = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)

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
