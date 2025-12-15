"""
Serializers for task management.

Implements serializers for:
- Learning tasks (Requirements: 7.1, 7.2, 7.3, 7.4, 7.5)
- Practice tasks (Requirements: 9.1, 9.2, 9.3, 9.4, 9.5)
- Exam tasks (Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6)

Properties:
- Property 17: 导师任务学员范围限制
- Property 18: 室经理任务学员范围限制
- Property 19: 任务分配记录完整性
"""
from rest_framework import serializers
from django.db import transaction

from apps.users.models import User
from apps.users.permissions import (
    get_current_role,
    validate_students_in_scope,
)
from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz


class TaskAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for TaskAssignment model."""
    assignee_name = serializers.CharField(source='assignee.real_name', read_only=True)
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
    
    class Meta:
        model = TaskKnowledge
        fields = ['id', 'knowledge', 'knowledge_title', 'knowledge_type', 'order']
        read_only_fields = ['order']


class TaskQuizSerializer(serializers.ModelSerializer):
    """Serializer for TaskQuiz model."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    question_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskQuiz
        fields = ['id', 'quiz', 'quiz_title', 'question_count', 'order']
        read_only_fields = ['order']
    
    def get_question_count(self, obj):
        """Get the number of questions in the quiz."""
        return obj.quiz.quiz_questions.count()


class TaskListSerializer(serializers.ModelSerializer):
    """Serializer for task list view."""
    created_by_name = serializers.CharField(source='created_by.real_name', read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    knowledge_count = serializers.ReadOnlyField()
    quiz_count = serializers.ReadOnlyField()
    assignee_count = serializers.ReadOnlyField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'task_type', 'task_type_display',
            'deadline', 'start_time', 'duration', 'pass_score',
            'is_closed', 'closed_at',
            'knowledge_count', 'quiz_count', 'assignee_count',
            'created_by_name', 'created_at', 'updated_at'
        ]


class TaskDetailSerializer(serializers.ModelSerializer):
    """Serializer for task detail view."""
    created_by_name = serializers.CharField(source='created_by.real_name', read_only=True)
    task_type_display = serializers.CharField(source='get_task_type_display', read_only=True)
    knowledge_items = TaskKnowledgeSerializer(source='task_knowledge', many=True, read_only=True)
    quizzes = TaskQuizSerializer(source='task_quizzes', many=True, read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'task_type', 'task_type_display',
            'deadline', 'start_time', 'duration', 'pass_score',
            'is_closed', 'closed_at',
            'knowledge_items', 'quizzes', 'assignments',
            'created_by_name', 'created_at', 'updated_at'
        ]


class BaseTaskCreateSerializer(serializers.Serializer):
    """
    Base serializer for creating tasks with common validation logic.
    
    Provides common fields and validation for:
    - Title and description
    - Deadline
    - Assignee validation based on role scope
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    """
    title = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    deadline = serializers.DateTimeField()
    assignee_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='学员ID列表（至少选择一个）'
    )
    
    def validate_assignee_ids(self, value):
        """Validate that all assignee IDs exist and are active."""
        if not value:
            raise serializers.ValidationError('请至少选择一个学员')
        
        existing_ids = set(
            User.objects.filter(
                id__in=value,
                is_active=True
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'学员不存在或已停用: {list(invalid_ids)}')
        
        return value
    
    def validate_assignees_in_scope(self, attrs):
        """
        Validate assignees are within the creator's scope.
        
        Requirements: 7.2, 7.3, 7.4, 9.2, 9.3, 9.4
        Properties: 17, 18
        """
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError('无法获取当前用户信息')
        
        assignee_ids = attrs.get('assignee_ids', [])
        current_role = get_current_role(request.user)
        
        # Validate assignees are within scope
        is_valid, invalid_ids = validate_students_in_scope(
            request.user, assignee_ids, current_role
        )
        
        if not is_valid:
            if current_role == 'MENTOR':
                raise serializers.ValidationError({
                    'assignee_ids': f'以下学员不在您的名下: {invalid_ids}'
                })
            elif current_role == 'DEPT_MANAGER':
                raise serializers.ValidationError({
                    'assignee_ids': f'以下学员不在您的部门: {invalid_ids}'
                })
            else:
                raise serializers.ValidationError({
                    'assignee_ids': f'无权为以下学员分配任务: {invalid_ids}'
                })
        
        return attrs


class LearningTaskCreateSerializer(BaseTaskCreateSerializer):
    """
    Serializer for creating learning tasks.
    
    Requirements:
    - 7.1: 创建学习任务时要求选择知识文档（可多选）和目标学员
    - 7.2: 导师创建学习任务时仅允许选择其名下学员
    - 7.3: 室经理创建学习任务时仅允许选择本室学员
    - 7.4: 管理员创建学习任务时允许选择任意学员
    - 7.5: 学习任务创建成功后为每个学员创建任务分配记录
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    """
    knowledge_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='知识文档ID列表（至少选择一个）'
    )
    
    def validate_knowledge_ids(self, value):
        """Validate that all knowledge IDs exist and are not deleted."""
        if not value:
            raise serializers.ValidationError('请至少选择一个知识文档')
        
        existing_ids = set(
            Knowledge.objects.filter(
                id__in=value,
                is_deleted=False
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'知识文档不存在: {list(invalid_ids)}')
        
        return value
    
    def validate(self, attrs):
        """Validate assignees are within the creator's scope."""
        return self.validate_assignees_in_scope(attrs)
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create learning task with knowledge items and assignments.
        
        Requirements: 7.1, 7.5
        Property 19: 任务分配记录完整性
        """
        request = self.context.get('request')
        knowledge_ids = validated_data.pop('knowledge_ids')
        assignee_ids = validated_data.pop('assignee_ids')
        
        # Create the task
        task = Task.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            task_type='LEARNING',
            deadline=validated_data['deadline'],
            created_by=request.user
        )
        
        # Create knowledge associations
        for order, knowledge_id in enumerate(knowledge_ids, start=1):
            TaskKnowledge.objects.create(
                task=task,
                knowledge_id=knowledge_id,
                order=order
            )
        
        # Create assignments for each student
        # Property 19: 任务分配记录完整性 - 确保为每个学员创建分配记录
        for assignee_id in assignee_ids:
            TaskAssignment.objects.create(
                task=task,
                assignee_id=assignee_id
                # status will be set to 'IN_PROGRESS' by the model's save method
            )
        
        return task


class PracticeTaskCreateSerializer(BaseTaskCreateSerializer):
    """
    Serializer for creating practice tasks.
    
    Requirements:
    - 9.1: 创建练习任务时要求选择试卷（可多选）、可选关联知识文档和目标学员
    - 9.2: 导师创建练习任务时仅允许选择其名下学员
    - 9.3: 室经理创建练习任务时仅允许选择本室学员
    - 9.4: 管理员创建练习任务时允许选择任意学员
    - 9.5: 练习任务创建成功后为每个学员创建任务分配记录，初始状态为"进行中"
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    """
    quiz_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text='试卷ID列表（至少选择一个）'
    )
    knowledge_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text='知识文档ID列表（可选）'
    )
    
    def validate_quiz_ids(self, value):
        """Validate that all quiz IDs exist and are not deleted."""
        if not value:
            raise serializers.ValidationError('请至少选择一个试卷')
        
        existing_ids = set(
            Quiz.objects.filter(
                id__in=value,
                is_deleted=False
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'试卷不存在: {list(invalid_ids)}')
        
        return value
    
    def validate_knowledge_ids(self, value):
        """Validate that all knowledge IDs exist and are not deleted (optional field)."""
        if not value:
            return value
        
        existing_ids = set(
            Knowledge.objects.filter(
                id__in=value,
                is_deleted=False
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'知识文档不存在: {list(invalid_ids)}')
        
        return value
    
    def validate(self, attrs):
        """Validate assignees are within the creator's scope."""
        return self.validate_assignees_in_scope(attrs)
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create practice task with quizzes, optional knowledge items, and assignments.
        
        Requirements: 9.1, 9.5
        Property 19: 任务分配记录完整性
        """
        request = self.context.get('request')
        quiz_ids = validated_data.pop('quiz_ids')
        knowledge_ids = validated_data.pop('knowledge_ids', [])
        assignee_ids = validated_data.pop('assignee_ids')
        
        # Create the task
        task = Task.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            task_type='PRACTICE',
            deadline=validated_data['deadline'],
            created_by=request.user
        )
        
        # Create quiz associations
        for order, quiz_id in enumerate(quiz_ids, start=1):
            TaskQuiz.objects.create(
                task=task,
                quiz_id=quiz_id,
                order=order
            )
        
        # Create knowledge associations (optional)
        for order, knowledge_id in enumerate(knowledge_ids, start=1):
            TaskKnowledge.objects.create(
                task=task,
                knowledge_id=knowledge_id,
                order=order
            )
        
        # Create assignments for each student
        # Property 19: 任务分配记录完整性 - 确保为每个学员创建分配记录
        # Requirements 9.5: 初始状态为"进行中"
        for assignee_id in assignee_ids:
            TaskAssignment.objects.create(
                task=task,
                assignee_id=assignee_id
                # status will be set to 'IN_PROGRESS' by the model's save method
            )
        
        return task


class ExamTaskCreateSerializer(BaseTaskCreateSerializer):
    """
    Serializer for creating exam tasks.
    
    Requirements:
    - 11.1: 创建考试任务时要求选择唯一试卷、设置考试时间窗口、限时和目标学员
    - 11.2: 用户设置考试规则时存储开始时间、截止时间、考试时长和及格分数
    - 11.3: 导师创建考试任务时仅允许选择其名下学员
    - 11.4: 室经理创建考试任务时仅允许选择本室学员
    - 11.5: 管理员创建考试任务时允许选择任意学员
    - 11.6: 考试任务创建成功后为每个学员创建任务分配记录，初始状态为"待考试"
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    - Property 27: 考试任务唯一试卷
    """
    quiz_id = serializers.IntegerField(
        help_text='试卷ID（考试任务只能选择一个试卷）'
    )
    start_time = serializers.DateTimeField(
        help_text='考试开始时间'
    )
    duration = serializers.IntegerField(
        min_value=1,
        help_text='考试时长（分钟）'
    )
    pass_score = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        min_value=0,
        help_text='及格分数'
    )
    
    def validate_quiz_id(self, value):
        """
        Validate that the quiz ID exists and is not deleted.
        
        Property 27: 考试任务唯一试卷 - 只允许选择一个试卷
        """
        if not Quiz.objects.filter(id=value, is_deleted=False).exists():
            raise serializers.ValidationError('试卷不存在')
        return value
    
    def validate(self, attrs):
        """
        Validate exam task data.
        
        Requirements: 11.1, 11.2
        """
        # Validate assignees are within scope
        attrs = self.validate_assignees_in_scope(attrs)
        
        # Validate start_time is before deadline
        start_time = attrs.get('start_time')
        deadline = attrs.get('deadline')
        
        if start_time and deadline and start_time >= deadline:
            raise serializers.ValidationError({
                'start_time': '考试开始时间必须早于截止时间'
            })
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """
        Create exam task with single quiz and assignments.
        
        Requirements: 11.1, 11.2, 11.6
        Properties:
        - Property 19: 任务分配记录完整性
        - Property 27: 考试任务唯一试卷
        """
        request = self.context.get('request')
        quiz_id = validated_data.pop('quiz_id')
        assignee_ids = validated_data.pop('assignee_ids')
        
        # Create the exam task with exam-specific fields
        task = Task.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            task_type='EXAM',
            deadline=validated_data['deadline'],
            start_time=validated_data['start_time'],
            duration=validated_data['duration'],
            pass_score=validated_data['pass_score'],
            created_by=request.user
        )
        
        # Create single quiz association (Property 27: 考试任务唯一试卷)
        TaskQuiz.objects.create(
            task=task,
            quiz_id=quiz_id,
            order=1
        )
        
        # Create assignments for each student
        # Property 19: 任务分配记录完整性 - 确保为每个学员创建分配记录
        # Requirements 11.6: 初始状态为"待考试"
        for assignee_id in assignee_ids:
            TaskAssignment.objects.create(
                task=task,
                assignee_id=assignee_id
                # status will be set to 'PENDING_EXAM' by the model's save method
            )
        
        return task
