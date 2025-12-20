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

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz, KnowledgeLearningProgress


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
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
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
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
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
        """
        Validate that all knowledge IDs exist, are not deleted, and are published.
        
        只允许选择已发布的知识文档用于任务分配。
        """
        if not value:
            raise serializers.ValidationError('请至少选择一个知识文档')
        
        # 查询已发布且未删除的知识文档
        published_knowledge = Knowledge.objects.filter(
            id__in=value,
            is_deleted=False,
            status='PUBLISHED'
        )
        published_ids = set(published_knowledge.values_list('id', flat=True))
        
        invalid_ids = set(value) - published_ids
        if invalid_ids:
            # 检查是草稿还是不存在
            draft_knowledge = Knowledge.objects.filter(
                id__in=invalid_ids,
                is_deleted=False,
                status='DRAFT'
            )
            draft_ids = set(draft_knowledge.values_list('id', flat=True))
            not_found_ids = invalid_ids - draft_ids
            
            errors = []
            if draft_ids:
                errors.append(f'以下知识文档为草稿状态，无法用于任务分配: {list(draft_ids)}')
            if not_found_ids:
                errors.append(f'知识文档不存在: {list(not_found_ids)}')
            
            raise serializers.ValidationError('; '.join(errors) if errors else '知识文档不可用')
        
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
        """
        Validate that all knowledge IDs exist, are not deleted, and are published (optional field).
        
        只允许选择已发布的知识文档用于任务分配。
        """
        if not value:
            return value
        
        # 查询已发布且未删除的知识文档
        published_knowledge = Knowledge.objects.filter(
            id__in=value,
            is_deleted=False,
            status='PUBLISHED'
        )
        published_ids = set(published_knowledge.values_list('id', flat=True))
        
        invalid_ids = set(value) - published_ids
        if invalid_ids:
            # 检查是草稿还是不存在
            draft_knowledge = Knowledge.objects.filter(
                id__in=invalid_ids,
                is_deleted=False,
                status='DRAFT'
            )
            draft_ids = set(draft_knowledge.values_list('id', flat=True))
            not_found_ids = invalid_ids - draft_ids
            
            errors = []
            if draft_ids:
                errors.append(f'以下知识文档为草稿状态，无法用于任务分配: {list(draft_ids)}')
            if not_found_ids:
                errors.append(f'知识文档不存在: {list(not_found_ids)}')
            
            raise serializers.ValidationError('; '.join(errors) if errors else '知识文档不可用')
        
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



class KnowledgeLearningProgressSerializer(serializers.ModelSerializer):
    """
    Serializer for KnowledgeLearningProgress model.
    
    Requirements:
    - 8.3: 记录完成状态和完成时间
    - 8.4: 展示完成时间
    
    Properties:
    - Property 20: 知识学习完成记录
    """
    knowledge_id = serializers.IntegerField(source='task_knowledge.knowledge.id', read_only=True)
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
    """
    Serializer for student's task assignment list.
    
    Requirements:
    - 17.2: 展示任务标题、类型、状态、截止时间和进度
    
    Properties:
    - Property 23: 任务逾期状态标记
    """
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    task_type = serializers.CharField(source='task.task_type', read_only=True)
    task_type_display = serializers.CharField(source='task.get_task_type_display', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Progress information
    progress = serializers.SerializerMethodField()
    
    # Exam-specific fields
    start_time = serializers.DateTimeField(source='task.start_time', read_only=True)
    duration = serializers.IntegerField(source='task.duration', read_only=True)
    pass_score = serializers.DecimalField(
        source='task.pass_score', max_digits=5, decimal_places=2, read_only=True
    )
    
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title', 'task_description',
            'task_type', 'task_type_display', 'deadline',
            'created_by_name', 'status', 'status_display',
            'progress', 'score', 'completed_at',
            'start_time', 'duration', 'pass_score',
            'created_at', 'updated_at'
        ]
    
    def get_progress(self, obj):
        """
        Calculate progress based on task type.
        
        For learning tasks: completed knowledge / total knowledge
        For practice tasks: completed quizzes / total quizzes
        For exam tasks: 0 or 100 based on completion
        """
        task = obj.task
        
        if task.task_type == 'LEARNING':
            total = task.task_knowledge.count()
            if total == 0:
                return {'completed': 0, 'total': 0, 'percentage': 0}
            completed = obj.knowledge_progress.filter(is_completed=True).count()
            return {
                'completed': completed,
                'total': total,
                'percentage': round(completed / total * 100, 1)
            }
        elif task.task_type == 'PRACTICE':
            total = task.task_quizzes.count()
            if total == 0:
                return {'completed': 0, 'total': 0, 'percentage': 0}
            # For practice, we'd need to check submissions - simplified for now
            completed = 0  # Will be implemented with submissions module
            return {
                'completed': completed,
                'total': total,
                'percentage': round(completed / total * 100, 1) if total > 0 else 0
            }
        else:  # EXAM
            return {
                'completed': 1 if obj.status == 'COMPLETED' else 0,
                'total': 1,
                'percentage': 100 if obj.status == 'COMPLETED' else 0
            }


class StudentLearningTaskDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for student's learning task detail view.
    
    Requirements:
    - 8.1: 展示任务标题、介绍、分配人、截止时间、整体进度和知识文档列表
    - 8.2: 展示知识内容和「我已学习掌握」按钮状态
    - 8.4: 展示已完成的知识子任务的完成时间
    
    Properties:
    - Property 20: 知识学习完成记录
    - Property 21: 学习任务自动完成
    """
    task_id = serializers.IntegerField(source='task.id', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    task_type = serializers.CharField(source='task.task_type', read_only=True)
    task_type_display = serializers.CharField(source='task.get_task_type_display', read_only=True)
    deadline = serializers.DateTimeField(source='task.deadline', read_only=True)
    created_by_name = serializers.CharField(source='task.created_by.username', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Progress information
    progress = serializers.SerializerMethodField()
    
    # Knowledge items with learning progress
    knowledge_items = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskAssignment
        fields = [
            'id', 'task_id', 'task_title', 'task_description',
            'task_type', 'task_type_display', 'deadline',
            'created_by_name', 'status', 'status_display',
            'progress', 'completed_at', 'knowledge_items',
            'created_at', 'updated_at'
        ]
    
    def get_progress(self, obj):
        """Calculate learning progress."""
        total = obj.task.task_knowledge.count()
        if total == 0:
            return {'completed': 0, 'total': 0, 'percentage': 0}
        completed = obj.knowledge_progress.filter(is_completed=True).count()
        return {
            'completed': completed,
            'total': total,
            'percentage': round(completed / total * 100, 1)
        }
    
    def get_knowledge_items(self, obj):
        """
        Get knowledge items with their learning progress.
        
        Requirements:
        - 8.2: 展示知识内容和学习状态
        - 8.4: 展示完成时间
        """
        task_knowledge_items = obj.task.task_knowledge.select_related('knowledge').all()
        progress_map = {
            p.task_knowledge_id: p
            for p in obj.knowledge_progress.all()
        }
        
        result = []
        for tk in task_knowledge_items:
            progress = progress_map.get(tk.id)
            knowledge = tk.knowledge
            
            item = {
                'id': tk.id,
                'knowledge_id': knowledge.id,
                'title': knowledge.title,
                'knowledge_type': knowledge.knowledge_type,
                'knowledge_type_display': knowledge.get_knowledge_type_display(),
                'summary': knowledge.summary,
                'order': tk.order,
                'is_completed': progress.is_completed if progress else False,
                'completed_at': progress.completed_at if progress else None,
            }
            result.append(item)
        
        return sorted(result, key=lambda x: x['order'])


class CompleteKnowledgeLearningSerializer(serializers.Serializer):
    """
    Serializer for completing knowledge learning.
    
    Requirements:
    - 8.3: 学员点击「我已学习掌握」时记录完成状态和完成时间
    
    Properties:
    - Property 20: 知识学习完成记录
    """
    knowledge_id = serializers.IntegerField(
        help_text='要标记为已学习的知识文档ID'
    )
    
    def validate_knowledge_id(self, value):
        """Validate that the knowledge ID exists."""
        if not Knowledge.objects.filter(id=value, is_deleted=False).exists():
            raise serializers.ValidationError('知识文档不存在')
        return value
