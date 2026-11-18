from decimal import Decimal

from rest_framework import serializers

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .policies import get_task_actions_payload
from .selectors import is_assignment_abnormal
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
    task_quiz_id = serializers.IntegerField(source='id', read_only=True)
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
            'task_quiz_id',
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
    knowledge_count = serializers.IntegerField(source='knowledge_count_value', read_only=True)
    quiz_count = serializers.IntegerField(source='quiz_count_value', read_only=True)
    assignee_count = serializers.IntegerField(source='assignee_count_value', read_only=True)
    completed_count = serializers.IntegerField(source='completed_count_value', read_only=True)
    pending_grading_count = serializers.IntegerField(source='pending_grading_count_value', read_only=True)
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

    def get_abnormal_count(self, obj):
        abnormal_ids = {
            assignment.assignee_id
            for assignment in obj.completed_assignments_for_abnormal
            if is_assignment_abnormal(assignment)
        }
        return len(abnormal_ids)

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
    knowledge_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    quiz_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    quiz_pass_scores = TaskQuizPassScoreUpdateSerializer(many=True, required=False)
    assignee_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)

    class Meta:
        model = Task
        fields = ['title', 'description', 'deadline', 'knowledge_ids', 'quiz_ids', 'quiz_pass_scores', 'assignee_ids']

    def validate_assignee_ids(self, value):
        if value is None:
            return value
        if not value:
            raise serializers.ValidationError('请至少选择一名指派人员')
        return value

    def validate(self, attrs):
        knowledge_ids = attrs.get('knowledge_ids')
        quiz_ids = attrs.get('quiz_ids')
        if knowledge_ids is not None and quiz_ids is not None and not knowledge_ids and not quiz_ids:
            raise serializers.ValidationError('请至少选择一个知识文档或试卷')
        return attrs


class TaskResourceOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    resource_type = serializers.ChoiceField(choices=['DOCUMENT', 'QUIZ'])
    space_tag_name = serializers.CharField(allow_null=True, required=False)
    question_count = serializers.IntegerField(required=False)
    total_score = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
