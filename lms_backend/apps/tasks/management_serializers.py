from decimal import Decimal

from rest_framework import serializers

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .policies import get_task_actions_payload
from .selectors import get_task_list_metrics
from .student_task_service import extract_knowledge_preview


class TaskAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskAssignment
        fields = ['id', 'assignee', 'status', 'completed_at', 'score', 'created_at', 'updated_at']
        read_only_fields = ['status', 'completed_at', 'score', 'created_at', 'updated_at']


class TaskKnowledgeSerializer(serializers.ModelSerializer):
    knowledge = serializers.IntegerField(source='source_knowledge_id', read_only=True, allow_null=True)
    knowledge_revision_id = serializers.IntegerField(source='knowledge_id', read_only=True)
    knowledge_title = serializers.CharField(source='knowledge.title', read_only=True)
    source_title = serializers.SerializerMethodField()
    space_tag_name = serializers.CharField(source='knowledge.space_tag_name', read_only=True)
    content_preview = serializers.SerializerMethodField()
    revision_number = serializers.IntegerField(source='knowledge.revision_number', read_only=True)

    class Meta:
        model = TaskKnowledge
        fields = [
            'id',
            'knowledge',
            'knowledge_revision_id',
            'knowledge_title',
            'source_title',
            'space_tag_name',
            'content_preview',
            'order',
            'revision_number',
        ]
        read_only_fields = ['order']

    def get_source_title(self, obj):
        return obj.source_knowledge.title if obj.source_knowledge else None

    def get_content_preview(self, obj):
        return extract_knowledge_preview(obj.knowledge)


class TaskQuizSerializer(serializers.ModelSerializer):
    quiz = serializers.IntegerField(source='source_quiz_id', read_only=True, allow_null=True)
    quiz_title = serializers.CharField(source='title', read_only=True)
    source_title = serializers.SerializerMethodField()
    question_count = serializers.IntegerField(read_only=True)
    total_score = serializers.DecimalField(max_digits=6, decimal_places=2, read_only=True)
    allow_retry = serializers.BooleanField(read_only=True)
    kind_label = serializers.CharField(read_only=True)
    duration = serializers.IntegerField(read_only=True, allow_null=True)
    pass_score = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True, allow_null=True)

    class Meta:
        model = TaskQuiz
        fields = [
            'id',
            'quiz',
            'quiz_title',
            'source_title',
            'question_count',
            'total_score',
            'order',
            'allow_retry',
            'kind_label',
            'duration',
            'pass_score',
        ]
        read_only_fields = ['order']

    def get_source_title(self, obj):
        return obj.source_quiz.title if obj.source_quiz else None


class TaskListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    knowledge_count = serializers.SerializerMethodField()
    quiz_count = serializers.SerializerMethodField()
    assignee_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    pending_grading_count = serializers.SerializerMethodField()
    abnormal_count = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'deadline',
            'knowledge_count',
            'quiz_count',
            'assignee_count',
            'completed_count',
            'pending_grading_count',
            'abnormal_count',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
            'actions',
        ]

    def _get_metrics(self, obj) -> dict[str, int]:
        metrics_map = (self.context or {}).get('task_metrics_map')
        if metrics_map is not None:
            return metrics_map.get(obj.id, {})
        if not hasattr(self, '_fallback_metrics_cache'):
            self._fallback_metrics_cache = {}
        if obj.id not in self._fallback_metrics_cache:
            self._fallback_metrics_cache[obj.id] = get_task_list_metrics([obj.id]).get(obj.id, {})
        return self._fallback_metrics_cache[obj.id]

    def get_knowledge_count(self, obj) -> int:
        return self._get_metrics(obj).get('knowledge_count', 0)

    def get_quiz_count(self, obj) -> int:
        return self._get_metrics(obj).get('quiz_count', 0)

    def get_assignee_count(self, obj) -> int:
        return self._get_metrics(obj).get('assignee_count', 0)

    def get_completed_count(self, obj) -> int:
        return self._get_metrics(obj).get('completed_count', 0)

    def get_pending_grading_count(self, obj) -> int:
        return self._get_metrics(obj).get('pending_grading_count', 0)

    def get_abnormal_count(self, obj) -> int:
        return self._get_metrics(obj).get('abnormal_count', 0)

    def get_actions(self, obj):
        return get_task_actions_payload(self.context.get('request'), obj)


class TaskDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    knowledge_items = TaskKnowledgeSerializer(source='task_knowledge', many=True, read_only=True)
    quizzes = TaskQuizSerializer(source='task_quizzes', many=True, read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    has_progress = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'deadline',
            'knowledge_items',
            'quizzes',
            'assignments',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
            'has_progress',
            'actions',
        ]

    def get_has_progress(self, obj):
        return obj.has_student_progress

    def get_actions(self, obj):
        return get_task_actions_payload(self.context.get('request'), obj)


class TaskQuizBindingSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    allow_retry = serializers.BooleanField()
    duration = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    pass_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=Decimal('0.01'),
    )

    def validate(self, attrs):
        if attrs['allow_retry']:
            attrs['duration'] = None
            attrs['pass_score'] = None
            return attrs
        if not attrs.get('duration'):
            raise serializers.ValidationError({'duration': '考试必须设置参考时间（分钟）'})
        if attrs.get('pass_score') is None:
            raise serializers.ValidationError({'pass_score': '考试必须设置及格分数'})
        return attrs


class TaskQuizPassScoreUpdateSerializer(serializers.Serializer):
    task_quiz_id = serializers.IntegerField()
    pass_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=Decimal('0.01'),
    )


class TaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    deadline = serializers.DateTimeField()
    knowledge_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    quizzes = TaskQuizBindingSerializer(many=True, required=False, default=list)
    assignee_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)

    def validate_assignee_ids(self, value):
        if not value:
            raise serializers.ValidationError('请至少选择一名指派人员')
        return value

    def validate(self, attrs):
        if not attrs.get('knowledge_ids', []) and not attrs.get('quizzes', []):
            raise serializers.ValidationError('请至少选择一个知识文档或试卷')
        return attrs


class TaskUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    deadline = serializers.DateTimeField(required=False)
    quiz_pass_scores = TaskQuizPassScoreUpdateSerializer(many=True, required=False)
    assignee_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)

    class Meta:
        model = Task
        fields = ['title', 'description', 'deadline', 'quiz_pass_scores', 'assignee_ids']

    def validate_assignee_ids(self, value):
        if value is None:
            return value
        if not value:
            raise serializers.ValidationError('请至少选择一名指派人员')
        return value


class TaskResourceOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    resource_type = serializers.ChoiceField(choices=['DOCUMENT', 'QUIZ'])
    space_tag_name = serializers.CharField(allow_null=True, required=False)
    question_count = serializers.IntegerField(required=False)
    total_score = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
