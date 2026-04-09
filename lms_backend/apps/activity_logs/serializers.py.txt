from rest_framework import serializers

from .models import ActivityLogPolicy


LOG_TYPE_CHOICES = (
    ('user', '账号'),
    ('content', '内容'),
    ('operation', '行为记录'),
)

_USER_ACTION_SUMMARIES = {
    'login': '{actor} 登录成功',
    'logout': '{actor} 退出登录',
    'login_failed': '{actor} 登录失败',
    'switch_role': '{actor} 切换了角色',
    'password_change': '{actor} 重置了用户密码',
    'role_assigned': '{actor} 更新了用户角色',
    'mentor_assigned': '{actor} 分配了导师',
    'activate': '{actor} 启用了用户账号',
    'deactivate': '{actor} 停用了用户账号',
}

_CONTENT_TYPE_NAMES = {
    'knowledge': '知识文档',
    'quiz': '试卷',
    'question': '题目',
    'assignment': '作业',
}

_CONTENT_ACTION_VERBS = {
    'create': '创建了',
    'update': '更新了',
    'delete': '删除了',
    'publish': '发布了',
}

_OPERATION_ACTION_SUMMARIES = {
    'create_and_assign': '{actor} 创建了任务《{target}》',
    'update_task': '{actor} 更新了任务《{target}》',
    'delete_task': '{actor} 删除了任务《{target}》',
    'create_spot_check': '{actor} 抽查了 {target}',
    'update_spot_check': '{actor} 更新了 {target} 的抽查记录',
    'delete_spot_check': '{actor} 删除了 {target} 的抽查记录',
    'manual_grade': '{actor} 批改了答卷',
    'batch_grade': '{actor} 批量评分',
    'start_quiz': '{actor} 开始答题《{target}》',
    'submit': '{actor} 提交了《{target}》',
    'complete_knowledge': '{actor} 完成了知识学习《{target}》',
}


def _build_summary(obj, log_type: str) -> str:
    """根据日志类型和字段生成一句自然语言概括。"""
    if log_type == 'user':
        actor_name = (obj.operator.username if obj.operator else obj.user.username) if obj.user else '系统'
        user_name = obj.user.username if obj.user else '未知用户'
        template = _USER_ACTION_SUMMARIES.get(obj.action, '{actor} 执行了 ' + obj.action)
        return template.format(actor=actor_name, user=user_name)

    if log_type == 'content':
        actor_name = obj.operator.username if obj.operator else '系统'
        verb = _CONTENT_ACTION_VERBS.get(obj.action, obj.action)
        type_name = _CONTENT_TYPE_NAMES.get(obj.content_type, obj.content_type)
        title = obj.content_title or ''
        if obj.content_type == 'question' and len(title) > 20:
            title = title[:20] + '...'
        if title and obj.content_type != 'question':
            return f'{actor_name} {verb}{type_name}《{title}》'
        return f'{actor_name} {verb}{type_name}'

    if log_type == 'operation':
        actor_name = obj.operator.username if obj.operator else '系统'
        target = obj.target_title or ''
        template = _OPERATION_ACTION_SUMMARIES.get(obj.action)
        if template:
            return template.format(actor=actor_name, target=target)
        return f'{actor_name} {obj.action}'

    return ''


class SimpleUserSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    employee_id = serializers.CharField(read_only=True)
    username = serializers.CharField(read_only=True)
    avatar_key = serializers.CharField(read_only=True)
    department_name = serializers.SerializerMethodField()
    department_code = serializers.SerializerMethodField()

    def get_department_name(self, obj):
        if isinstance(obj, dict):
            return obj.get('department_name')
        department = getattr(obj, 'department', None)
        return getattr(department, 'name', None)

    def get_department_code(self, obj):
        if isinstance(obj, dict):
            return obj.get('department_code')
        department = getattr(obj, 'department', None)
        return getattr(department, 'code', None)


class ActivityLogItemSerializer(serializers.Serializer):
    id = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    actor = serializers.SerializerMethodField()
    action = serializers.CharField()
    status = serializers.CharField()
    summary = serializers.SerializerMethodField()
    description = serializers.CharField()
    created_at = serializers.DateTimeField()

    def get_id(self, obj):
        return f"{self.context['log_type']}-{obj.id}"

    def get_category(self, obj):
        return self.context['log_type']

    def get_actor(self, obj):
        log_type = self.context['log_type']
        if log_type == 'user':
            actor = obj.operator if obj.operator else obj.user
        else:
            actor = obj.operator
        if actor is None:
            return None
        return SimpleUserSerializer(actor).data

    def get_summary(self, obj):
        return _build_summary(obj, self.context['log_type'])


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


class ActivityLogBulkDeleteSerializer(serializers.Serializer):
    item_ids = serializers.ListField(
        child=serializers.CharField(trim_whitespace=True),
        allow_empty=False,
    )

    def validate_item_ids(self, value: list[str]) -> list[str]:
        normalized_ids = []
        seen_ids = set()

        for item_id in value:
            if not item_id:
                raise serializers.ValidationError('item_ids 不能为空')
            if item_id in seen_ids:
                continue
            seen_ids.add(item_id)
            normalized_ids.append(item_id)

        return normalized_ids
