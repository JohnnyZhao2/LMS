"""
Serializers for task management.
重构说明：
- 任务不再区分类型，一个任务可以包含任意组合的知识文档和试卷
- 合并三个创建 Serializer 为一个统一的 TaskCreateSerializer
- 简化状态逻辑
- 业务逻辑已提取到 services.py
"""
from rest_framework import serializers
from apps.users.permissions import (
    get_current_role,
    get_accessible_student_ids,
)
from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz, KnowledgeLearningProgress
from .services import TaskService, StudentTaskService, extract_knowledge_summary

def validate_assignee_scope(user, assignee_ids: list[int], request=None) -> None:
    invalid_ids = list(set(assignee_ids) - get_accessible_student_ids(user, request=request))
    if not invalid_ids:
        return
    current_role = get_current_role(user, request)
    if current_role == 'MENTOR':
        raise serializers.ValidationError({
            'assignee_ids': f'以下学员不在您的名下: {invalid_ids}'
        })
    elif current_role == 'DEPT_MANAGER':
        raise serializers.ValidationError({
            'assignee_ids': f'以下学员不在您的部门: {invalid_ids}'
        })
    raise serializers.ValidationError({
        'assignee_ids': f'无权为以下学员分配任务: {invalid_ids}'
    })

class TaskAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for TaskAssignment model."""
    assignee_name = serializers.CharField(source='assignee.username', read_only=True)
    assignee_employee_id = serializers.CharField(source='assignee.employee_id', read_only=True)
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'assignee', 'assignee_name', 'assignee_employee_id',
            'status', 'completed_at', 'score', 'created_at', 'updated_at'
        ]
        read_only_fields = ['status', 'completed_at', 'score', 'created_at', 'updated_at']
class TaskKnowledgeSerializer(serializers.ModelSerializer):
    """Serializer for TaskKnowledge model."""
    knowledge_title = serializers.CharField(source='knowledge.title', read_only=True)
    knowledge_type = serializers.CharField(source='knowledge.knowledge_type', read_only=True)
    knowledge_type_display = serializers.SerializerMethodField()
    summary = serializers.SerializerMethodField()
    resource_uuid = serializers.UUIDField(source='knowledge.resource_uuid', read_only=True)
    is_current = serializers.BooleanField(source='knowledge.is_current', read_only=True)
    class Meta:
        model = TaskKnowledge
        fields = [
            'id', 'knowledge', 'knowledge_title', 'knowledge_type', 'knowledge_type_display',
            'summary', 'order', 'resource_uuid', 'is_current'
        ]
        read_only_fields = ['order']
    def get_knowledge_type_display(self, obj):
        return obj.knowledge.get_knowledge_type_display()

    def get_summary(self, obj):
        return extract_knowledge_summary(obj.knowledge)
class TaskQuizSerializer(serializers.ModelSerializer):
    """Serializer for TaskQuiz model."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    question_count = serializers.IntegerField(source='quiz.question_count', read_only=True)
    total_score = serializers.DecimalField(source='quiz.total_score', max_digits=6, decimal_places=2, read_only=True)
    subjective_question_count = serializers.IntegerField(source='quiz.subjective_question_count', read_only=True)
    objective_question_count = serializers.IntegerField(source='quiz.objective_question_count', read_only=True)
    # Quiz type info
    quiz_type = serializers.CharField(source='quiz.quiz_type', read_only=True)
    quiz_type_display = serializers.CharField(source='quiz.get_quiz_type_display', read_only=True)
    duration = serializers.IntegerField(source='quiz.duration', read_only=True)
    pass_score = serializers.DecimalField(source='quiz.pass_score', max_digits=5, decimal_places=2, read_only=True)
    resource_uuid = serializers.UUIDField(source='quiz.resource_uuid', read_only=True)
    is_current = serializers.BooleanField(source='quiz.is_current', read_only=True)
    class Meta:
        model = TaskQuiz
        fields = [
            'id', 'quiz', 'quiz_title', 'question_count', 'total_score',
            'subjective_question_count', 'objective_question_count', 'order',
            'quiz_type', 'quiz_type_display', 'duration', 'pass_score',
            'resource_uuid', 'is_current'
        ]
        read_only_fields = ['order']
class TaskListSerializer(serializers.ModelSerializer):
    """Serializer for task list view."""
    created_by = serializers.IntegerField(source='created_by.id', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by = serializers.IntegerField(source='updated_by.id', read_only=True, allow_null=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    knowledge_count = serializers.ReadOnlyField()
    quiz_count = serializers.ReadOnlyField()
    exam_count = serializers.ReadOnlyField()
    practice_count = serializers.ReadOnlyField()
    assignee_count = serializers.ReadOnlyField()
    completed_count = serializers.ReadOnlyField()

    is_closed = serializers.BooleanField(source='is_effectively_closed', read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description',
            'deadline', 'is_closed', 'closed_at',
            'knowledge_count', 'quiz_count', 'exam_count', 'practice_count',
            'assignee_count', 'completed_count',
            'created_by', 'created_by_name', 'updated_by', 'updated_by_name', 'created_at', 'updated_at'
        ]
class TaskDetailSerializer(serializers.ModelSerializer):
    """Serializer for task detail view."""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    updated_by = serializers.IntegerField(source='updated_by.id', read_only=True, allow_null=True)
    updated_by_name = serializers.CharField(source='updated_by.username', read_only=True, allow_null=True)
    knowledge_items = TaskKnowledgeSerializer(source='task_knowledge', many=True, read_only=True)
    quizzes = TaskQuizSerializer(source='task_quizzes', many=True, read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    is_closed = serializers.BooleanField(source='is_effectively_closed', read_only=True)
    has_progress = serializers.SerializerMethodField()

    def get_has_progress(self, obj):
        """Check if task has student learning progress"""
        service = TaskService()
        return service.has_student_progress(obj)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description',
            'deadline', 'is_closed', 'closed_at',
            'knowledge_items', 'quizzes', 'assignments',
            'created_by_name', 'updated_by', 'updated_by_name', 'created_at', 'updated_at',
            'has_progress',
        ]
class TaskCreateSerializer(serializers.Serializer):
    """
    统一的任务创建 Serializer
    一个任务可以包含：
    - knowledge_ids: 知识文档列表（可选）
    - quiz_ids: 试卷列表（可选）
    - 至少需要选择一个知识文档或试卷
    业务逻辑委托给 TaskService 处理。
    """
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    deadline = serializers.DateTimeField()
    knowledge_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text='知识文档ID列表（可选）'
    )
    quiz_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text='试卷ID列表（可选）'
    )
    assignee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='学员ID列表（至少选择一个）'
    )
    def validate_knowledge_ids(self, value):
        """验证知识文档ID - 使用 TaskService"""
        if not value:
            return value
        is_valid, invalid_ids = TaskService.validate_knowledge_ids(value)
        if not is_valid:
            raise serializers.ValidationError(f'知识文档不可用: {invalid_ids}')
        return value
    def validate_quiz_ids(self, value):
        """验证试卷ID - 使用 TaskService"""
        if not value:
            return value
        is_valid, invalid_ids = TaskService.validate_quiz_ids(value)
        if not is_valid:
            raise serializers.ValidationError(f'试卷不存在: {invalid_ids}')
        return value
    def validate_assignee_ids(self, value):
        """验证学员ID - 使用 TaskService"""
        if not value:
            raise serializers.ValidationError('请至少选择一个学员')
        is_valid, invalid_ids = TaskService.validate_assignee_ids(value)
        if not is_valid:
            raise serializers.ValidationError(f'学员不存在或已停用: {invalid_ids}')
        return value
    def validate(self, attrs):
        """验证任务数据"""
        knowledge_ids = attrs.get('knowledge_ids', [])
        quiz_ids = attrs.get('quiz_ids', [])
        # 至少需要选择一个知识文档或试卷
        if not knowledge_ids and not quiz_ids:
            raise serializers.ValidationError('请至少选择一个知识文档或试卷')
        # 验证学员范围
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('无法获取当前用户信息')
        assignee_ids = attrs.get('assignee_ids', [])
        validate_assignee_scope(request.user, assignee_ids, request)
        return attrs
    def create(self, validated_data):
        """创建任务 - 委托给 TaskService"""
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
    """
    任务更新 Serializer
    允许更新任务的标题、描述、截止时间等基本信息，以及关联的知识文档、试卷和学员。
    """
    title = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    deadline = serializers.DateTimeField(required=False)
    knowledge_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text='知识文档ID列表'
    )
    quiz_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text='试卷ID列表'
    )
    assignee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text='学员ID列表'
    )
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'deadline',
            'knowledge_ids', 'quiz_ids', 'assignee_ids'
        ]
    def validate_knowledge_ids(self, value):
        if value is None:
            return value
        if value:
            is_valid, invalid_ids = TaskService.validate_knowledge_ids(value)
            if not is_valid:
                raise serializers.ValidationError(f'以下知识文档不可用: {invalid_ids}')
        return value

    def validate_quiz_ids(self, value):
        if value is None:
            return value
        if value:
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
            raise serializers.ValidationError(f'学员不存在或已停用: {invalid_ids}')
        return value
    def validate(self, attrs):
        """验证更新数据"""
        knowledge_ids = attrs.get('knowledge_ids')
        quiz_ids = attrs.get('quiz_ids')
        # 如果同时提供了知识文档和试卷，检查是否至少有一个
        if knowledge_ids is not None and quiz_ids is not None:
            if not knowledge_ids and not quiz_ids:
                raise serializers.ValidationError('请至少选择一个知识文档或试卷')
        # 验证学员范围
        assignee_ids = attrs.get('assignee_ids')
        if assignee_ids is not None:
            request = self.context.get('request')
            if request and request.user:
                validate_assignee_scope(request.user, assignee_ids)
        return attrs
    def update(self, instance, validated_data):
        """更新任务信息 - 委托给 TaskService"""
        # 检查任务是否已关闭
        if instance.is_closed:
            raise serializers.ValidationError('任务已关闭，无法修改')
        # 提取关联资源字段
        knowledge_ids = validated_data.pop('knowledge_ids', None)
        quiz_ids = validated_data.pop('quiz_ids', None)
        assignee_ids = validated_data.pop('assignee_ids', None)
        # 委托给 TaskService 处理更新
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('无法获取当前用户信息')
        service = TaskService(request)
        return service.update_task(
            task=instance,
            knowledge_ids=knowledge_ids,
            quiz_ids=quiz_ids,
            assignee_ids=assignee_ids,
            **validated_data
        )
class KnowledgeLearningProgressSerializer(serializers.ModelSerializer):
    """Serializer for KnowledgeLearningProgress model."""
    knowledge_id = serializers.IntegerField(source='task_knowledge.knowledge_id', read_only=True)
    knowledge_title = serializers.CharField(source='task_knowledge.knowledge.title', read_only=True)
    knowledge_type = serializers.CharField(source='task_knowledge.knowledge.knowledge_type', read_only=True)
    order = serializers.IntegerField(source='task_knowledge.order', read_only=True)
    class Meta:
        model = KnowledgeLearningProgress
        fields = [
            'id', 'knowledge_id', 'knowledge_title', 'knowledge_type', 'order',
            'is_completed', 'completed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['is_completed', 'completed_at', 'created_at', 'updated_at']
class StudentAssignmentListSerializer(serializers.ModelSerializer):
    """Serializer for student's task assignment list."""
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    # 是否包含试卷和知识文档
    has_quiz = serializers.SerializerMethodField()
    has_knowledge = serializers.SerializerMethodField()
    # Progress information
    progress = serializers.SerializerMethodField()
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title', 'task_description',
            'deadline', 'created_by_name', 'status', 'status_display',
            'has_quiz', 'has_knowledge',
            'progress', 'score', 'completed_at',
            'created_at', 'updated_at'
        ]
    def get_has_quiz(self, obj):
        return bool(obj.task.task_quizzes.all())
    def get_has_knowledge(self, obj):
        return bool(obj.task.task_knowledge.all())
    def get_progress(self, obj):
        """获取详细进度记录"""
        return obj.get_progress_data()
class StudentTaskDetailSerializer(serializers.ModelSerializer):
    """Serializer for student's task detail view."""
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    # Progress information
    progress = serializers.SerializerMethodField()
    # Knowledge items with learning progress
    knowledge_items = serializers.SerializerMethodField()
    # Quiz items
    quiz_items = serializers.SerializerMethodField()
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title', 'task_description',
            'deadline', 'created_by_name', 'status', 'status_display',
            'progress', 'completed_at', 'score',
            'knowledge_items', 'quiz_items',
            'created_at', 'updated_at'
        ]
    def get_progress(self, obj):
        """获取详细进度数据"""
        return obj.get_progress_data()
    def get_knowledge_items(self, obj):
        service = StudentTaskService()
        return service.get_student_knowledge_items(obj)

    def get_quiz_items(self, obj):
        service = StudentTaskService()
        return service.get_student_quiz_items(obj)
class CompleteKnowledgeLearningSerializer(serializers.Serializer):
    """Serializer for completing knowledge learning."""
    knowledge_id = serializers.IntegerField(
        help_text='要标记为已学习的知识文档ID'
    )
    def validate_knowledge_id(self, value):
        """Validate that the knowledge ID exists."""
        is_valid, invalid_ids = TaskService.validate_knowledge_ids([value])
        if not is_valid:
            raise serializers.ValidationError(f'知识文档不可用: {invalid_ids}')
        return value


# ============ Task Analytics Serializers ============

class CompletionSerializer(serializers.Serializer):
    """完成情况序列化器"""
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class AccuracySerializer(serializers.Serializer):
    """准确率序列化器"""
    has_quiz = serializers.BooleanField()
    percentage = serializers.FloatField(allow_null=True)


class NodeProgressSerializer(serializers.Serializer):
    """节点进度序列化器"""
    node_id = serializers.IntegerField()
    node_name = serializers.CharField()
    category = serializers.ChoiceField(choices=['KNOWLEDGE', 'PRACTICE', 'EXAM'])
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    percentage = serializers.FloatField()


class DistributionItemSerializer(serializers.Serializer):
    """分布项序列化器"""
    range = serializers.CharField()
    count = serializers.IntegerField()


class TaskAnalyticsSerializer(serializers.Serializer):
    """任务分析数据序列化器"""
    completion = CompletionSerializer()
    average_time = serializers.FloatField()
    accuracy = AccuracySerializer()
    abnormal_count = serializers.IntegerField()
    node_progress = NodeProgressSerializer(many=True)
    time_distribution = DistributionItemSerializer(many=True)
    score_distribution = DistributionItemSerializer(many=True, allow_null=True)
    pass_rate = serializers.FloatField(allow_null=True)


class StudentExecutionSerializer(serializers.Serializer):
    """学员执行情况序列化器"""
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    employee_id = serializers.CharField()
    department = serializers.CharField()
    status = serializers.ChoiceField(
        choices=['COMPLETED', 'IN_PROGRESS', 'OVERDUE', 'COMPLETED_ABNORMAL']
    )
    node_progress = serializers.CharField()
    score = serializers.FloatField(allow_null=True)
    time_spent = serializers.IntegerField()
    answer_details = serializers.CharField()
    is_abnormal = serializers.BooleanField()
