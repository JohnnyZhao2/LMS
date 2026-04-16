"""Serializers for task management."""

from rest_framework import serializers

from apps.authorization.engine import authorize, scope_filter
from apps.users.models import User

from .models import KnowledgeLearningProgress, Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .selectors import is_assignment_abnormal
from .student_task_service import StudentTaskService, extract_knowledge_preview
from .task_service import TaskService

DEFAULT_TASK_ACTIONS = {
    'view': False,
    'update': False,
    'delete': False,
    'analytics': False,
}


def get_task_actions(request, obj) -> dict[str, bool]:
    if request is None:
        return dict(DEFAULT_TASK_ACTIONS)
    return {
        'view': authorize('task.view', request, resource=obj).allowed,
        'update': authorize('task.update', request, resource=obj).allowed,
        'delete': authorize('task.delete', request, resource=obj).allowed,
        'analytics': authorize('task.analytics.view', request, resource=obj).allowed,
    }


def validate_assignee_scope(user, assignee_ids: list[int], request) -> None:
    accessible_ids = set(
        scope_filter('task.assign', request, resource_model=User).values_list('id', flat=True)
    )
    invalid_ids = sorted(set(assignee_ids) - accessible_ids)
    if invalid_ids:
        raise serializers.ValidationError({'assignee_ids': f'以下学员不在当前可分配范围: {invalid_ids}'})


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
    quiz_revision_id = serializers.IntegerField(source='quiz_id', read_only=True)
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    source_title = serializers.SerializerMethodField()
    question_count = serializers.IntegerField(source='quiz.question_count', read_only=True)
    total_score = serializers.DecimalField(source='quiz.total_score', max_digits=6, decimal_places=2, read_only=True)
    quiz_type = serializers.CharField(source='quiz.quiz_type', read_only=True)
    quiz_type_display = serializers.CharField(source='quiz.get_quiz_type_display', read_only=True)
    duration = serializers.IntegerField(source='quiz.duration', read_only=True)
    pass_score = serializers.DecimalField(source='quiz.pass_score', max_digits=5, decimal_places=2, read_only=True)
    revision_number = serializers.IntegerField(source='quiz.revision_number', read_only=True)

    class Meta:
        model = TaskQuiz
        fields = [
            'id',
            'task_quiz_id',
            'quiz',
            'quiz_revision_id',
            'quiz_title',
            'source_title',
            'question_count',
            'total_score',
            'order',
            'quiz_type',
            'quiz_type_display',
            'duration',
            'pass_score',
            'revision_number',
        ]
        read_only_fields = ['order']

    def get_source_title(self, obj):
        return obj.source_quiz.title if obj.source_quiz else None


class TaskListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    knowledge_count = serializers.IntegerField(source='knowledge_count_value', read_only=True)
    quiz_count = serializers.IntegerField(source='quiz_count_value', read_only=True)
    exam_count = serializers.IntegerField(source='exam_count_value', read_only=True)
    practice_count = serializers.IntegerField(source='practice_count_value', read_only=True)
    assignee_count = serializers.IntegerField(source='assignee_count_value', read_only=True)
    completed_count = serializers.IntegerField(source='completed_count_value', read_only=True)
    pending_grading_count = serializers.IntegerField(source='pending_grading_count_value', read_only=True)
    abnormal_count = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    def get_abnormal_count(self, obj):
        abnormal_ids = {
            assignment.assignee_id
            for assignment in obj.completed_assignments_for_abnormal
            if is_assignment_abnormal(assignment)
        }
        return len(abnormal_ids)

    def get_actions(self, obj):
        return get_task_actions(self.context.get('request'), obj)

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'deadline',
            'knowledge_count',
            'quiz_count',
            'exam_count',
            'practice_count',
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


class TaskDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    knowledge_items = TaskKnowledgeSerializer(source='task_knowledge', many=True, read_only=True)
    quizzes = TaskQuizSerializer(source='task_quizzes', many=True, read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    has_progress = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    def get_has_progress(self, obj):
        return obj.has_student_progress

    def get_actions(self, obj):
        return get_task_actions(self.context.get('request'), obj)

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


class TaskCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    deadline = serializers.DateTimeField()
    knowledge_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    quiz_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    assignee_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)

    def validate_knowledge_ids(self, value):
        if value:
            is_valid, invalid_ids = TaskService.validate_knowledge_ids(value)
            if not is_valid:
                raise serializers.ValidationError(f'知识文档不可用: {invalid_ids}')
        return value

    def validate_quiz_ids(self, value):
        if value:
            is_valid, invalid_ids = TaskService.validate_quiz_ids(value)
            if not is_valid:
                raise serializers.ValidationError(f'试卷不存在: {invalid_ids}')
        return value

    def validate_assignee_ids(self, value):
        if not value:
            raise serializers.ValidationError('请至少选择一个学员')
        is_valid, invalid_ids = TaskService.validate_assignee_ids(value)
        if not is_valid:
            raise serializers.ValidationError(f'学员不存在、已停用或无学员身份: {invalid_ids}')
        return value

    def validate(self, attrs):
        if not attrs.get('knowledge_ids', []) and not attrs.get('quiz_ids', []):
            raise serializers.ValidationError('请至少选择一个知识文档或试卷')
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('无法获取当前用户信息')
        validate_assignee_scope(request.user, attrs.get('assignee_ids', []), request)
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        service = TaskService(request)
        return service.create_task(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            deadline=validated_data['deadline'],
            knowledge_ids=validated_data.get('knowledge_ids', []),
            quiz_ids=validated_data.get('quiz_ids', []),
            assignee_ids=validated_data.get('assignee_ids', []),
        )


class TaskUpdateSerializer(serializers.ModelSerializer):
    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    deadline = serializers.DateTimeField(required=False)
    knowledge_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    quiz_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)
    assignee_ids = serializers.ListField(child=serializers.IntegerField(), required=False, allow_empty=True)

    class Meta:
        model = Task
        fields = ['title', 'description', 'deadline', 'knowledge_ids', 'quiz_ids', 'assignee_ids']

    def validate_knowledge_ids(self, value):
        if value is not None and value:
            is_valid, invalid_ids = TaskService.validate_knowledge_ids(value)
            if not is_valid:
                raise serializers.ValidationError(f'以下知识文档不可用: {invalid_ids}')
        return value

    def validate_quiz_ids(self, value):
        if value is not None and value:
            is_valid, invalid_ids = TaskService.validate_quiz_ids(value)
            if not is_valid:
                raise serializers.ValidationError(f'以下试卷不存在: {invalid_ids}')
        return value

    def validate_assignee_ids(self, value):
        if value is None:
            return value
        if not value:
            raise serializers.ValidationError('请至少选择一个学员')
        is_valid, invalid_ids = TaskService.validate_assignee_ids(value)
        if not is_valid:
            raise serializers.ValidationError(f'学员不存在、已停用或无学员身份: {invalid_ids}')
        return value

    def validate(self, attrs):
        knowledge_ids = attrs.get('knowledge_ids')
        quiz_ids = attrs.get('quiz_ids')
        if knowledge_ids is not None and quiz_ids is not None and not knowledge_ids and not quiz_ids:
            raise serializers.ValidationError('请至少选择一个知识文档或试卷')
        assignee_ids = attrs.get('assignee_ids')
        if assignee_ids is not None:
            request = self.context.get('request')
            if not request or not request.user:
                raise serializers.ValidationError('无法获取当前用户信息')
            validate_assignee_scope(request.user, assignee_ids, request)
        return attrs

    def update(self, instance, validated_data):
        knowledge_ids = validated_data.pop('knowledge_ids', None)
        quiz_ids = validated_data.pop('quiz_ids', None)
        assignee_ids = validated_data.pop('assignee_ids', None)
        request = self.context.get('request')
        service = TaskService(request)
        return service.update_task(
            task=instance,
            knowledge_ids=knowledge_ids,
            quiz_ids=quiz_ids,
            assignee_ids=assignee_ids,
            **validated_data,
        )


class KnowledgeLearningProgressSerializer(serializers.ModelSerializer):
    knowledge_id = serializers.IntegerField(source='task_knowledge.source_knowledge_id', read_only=True)
    knowledge_title = serializers.CharField(source='task_knowledge.knowledge.title', read_only=True)
    order = serializers.IntegerField(source='task_knowledge.order', read_only=True)

    class Meta:
        model = KnowledgeLearningProgress
        fields = [
            'id',
            'knowledge_id',
            'knowledge_title',
            'order',
            'is_completed',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['is_completed', 'completed_at', 'created_at', 'updated_at']


class StudentAssignmentListSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_quiz = serializers.SerializerMethodField()
    has_knowledge = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignment
        fields = [
            'id',
            'task_id',
            'task_title',
            'task_description',
            'deadline',
            'created_by_name',
            'status',
            'status_display',
            'has_quiz',
            'has_knowledge',
            'progress',
            'score',
            'completed_at',
            'created_at',
            'updated_at',
        ]

    def get_has_quiz(self, obj):
        return obj.task.has_quiz

    def get_has_knowledge(self, obj):
        return obj.task.has_knowledge

    def get_progress(self, obj):
        return obj.get_progress_data()


class StudentTaskDetailSerializer(serializers.ModelSerializer):
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    progress = serializers.SerializerMethodField()
    knowledge_items = serializers.SerializerMethodField()
    quiz_items = serializers.SerializerMethodField()

    class Meta:
        model = TaskAssignment
        fields = [
            'id',
            'task_id',
            'task_title',
            'task_description',
            'deadline',
            'created_by_name',
            'status',
            'status_display',
            'progress',
            'completed_at',
            'score',
            'knowledge_items',
            'quiz_items',
            'created_at',
            'updated_at',
        ]

    def get_progress(self, obj):
        return obj.get_progress_data()

    def get_knowledge_items(self, obj):
        return StudentTaskService.get_student_knowledge_items(obj)

    def get_quiz_items(self, obj):
        return StudentTaskService.get_student_quiz_items(obj)


class CompleteKnowledgeLearningSerializer(serializers.Serializer):
    task_knowledge_id = serializers.IntegerField(min_value=1, help_text='要标记为已学习的任务知识节点ID')

    def validate_task_knowledge_id(self, value):
        if not TaskKnowledge.objects.filter(id=value).exists():
            raise serializers.ValidationError('任务知识不存在')
        return value


class CompletionSerializer(serializers.Serializer):
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class AccuracySerializer(serializers.Serializer):
    has_quiz = serializers.BooleanField()
    percentage = serializers.FloatField(allow_null=True)


class NodeProgressSerializer(serializers.Serializer):
    node_id = serializers.IntegerField()
    node_name = serializers.CharField()
    category = serializers.ChoiceField(choices=['KNOWLEDGE', 'PRACTICE', 'EXAM'])
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class DistributionItemSerializer(serializers.Serializer):
    range = serializers.CharField()
    count = serializers.IntegerField()


class TaskAnalyticsSerializer(serializers.Serializer):
    completion = CompletionSerializer()
    average_time = serializers.FloatField()
    accuracy = AccuracySerializer()
    abnormal_count = serializers.IntegerField()
    node_progress = NodeProgressSerializer(many=True)
    time_distribution = DistributionItemSerializer(many=True)
    score_distribution = DistributionItemSerializer(many=True, allow_null=True)
    pass_rate = serializers.FloatField(allow_null=True)


class TaskResourceOptionSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    resource_type = serializers.ChoiceField(choices=['DOCUMENT', 'QUIZ'])
    space_tag_name = serializers.CharField(allow_null=True, required=False)
    question_count = serializers.IntegerField(required=False)
    quiz_type = serializers.CharField(required=False)


class StudentExecutionSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    avatar_key = serializers.CharField()
    employee_id = serializers.CharField()
    department = serializers.CharField()
    status = serializers.ChoiceField(
        choices=['COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED_ABNORMAL']
    )
    node_progress = serializers.CharField()
    score = serializers.FloatField(allow_null=True)
    time_spent = serializers.IntegerField()
    is_abnormal = serializers.BooleanField()
