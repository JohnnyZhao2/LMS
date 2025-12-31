"""
Serializers for task management.

重构说明：
- 任务不再区分类型，一个任务可以包含任意组合的知识文档和试卷
- 合并三个创建 Serializer 为一个统一的 TaskCreateSerializer
- 简化状态逻辑
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
    knowledge_type_display = serializers.SerializerMethodField()
    resource_uuid = serializers.UUIDField(read_only=True)
    version_number = serializers.IntegerField(read_only=True)
    
    summary = serializers.SerializerMethodField()
    
    class Meta:
        model = TaskKnowledge
        fields = [
            'id', 'knowledge', 'knowledge_title', 'knowledge_type', 'knowledge_type_display',
            'summary', 'resource_uuid', 'version_number', 'order'
        ]
        read_only_fields = ['order']
    
    def get_knowledge_type_display(self, obj):
        return obj.knowledge.get_knowledge_type_display()
    
    def get_summary(self, obj):
        knowledge = obj.knowledge
        if knowledge.knowledge_type == 'OTHER':
            text = knowledge.content or ''
        else:
            parts = [
                knowledge.fault_scenario,
                knowledge.trigger_process,
                knowledge.solution,
                knowledge.verification_plan,
                knowledge.recovery_plan,
            ]
            text = next((p for p in parts if p), '')
        return text[:160] if text else ''


class TaskQuizSerializer(serializers.ModelSerializer):
    """Serializer for TaskQuiz model."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    question_count = serializers.IntegerField(source='quiz.question_count', read_only=True)
    total_score = serializers.DecimalField(source='quiz.total_score', max_digits=6, decimal_places=2, read_only=True)
    resource_uuid = serializers.UUIDField(read_only=True)
    version_number = serializers.IntegerField(read_only=True)
    
    subjective_question_count = serializers.IntegerField(source='quiz.subjective_question_count', read_only=True)
    objective_question_count = serializers.IntegerField(source='quiz.objective_question_count', read_only=True)
    
    # Quiz type info
    quiz_type = serializers.CharField(source='quiz.quiz_type', read_only=True)
    quiz_type_display = serializers.CharField(source='quiz.get_quiz_type_display', read_only=True)
    duration = serializers.IntegerField(source='quiz.duration', read_only=True)
    pass_score = serializers.DecimalField(source='quiz.pass_score', max_digits=5, decimal_places=2, read_only=True)
    
    class Meta:
        model = TaskQuiz
        fields = [
            'id', 'quiz', 'quiz_title', 'question_count', 'total_score',
            'subjective_question_count', 'objective_question_count',
            'resource_uuid', 'version_number', 'order',
            'quiz_type', 'quiz_type_display', 'duration', 'pass_score'
        ]
        read_only_fields = ['order']


class TaskListSerializer(serializers.ModelSerializer):
    """Serializer for task list view."""
    created_by = serializers.IntegerField(source='created_by.id', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    knowledge_count = serializers.ReadOnlyField()
    quiz_count = serializers.ReadOnlyField()
    assignee_count = serializers.ReadOnlyField()
    completed_count = serializers.ReadOnlyField()
    pass_rate = serializers.ReadOnlyField()
    # 计算属性：手动关闭或截止时间已过都返回 True
    is_closed = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description',
            'deadline', 'is_closed', 'closed_at',
            'knowledge_count', 'quiz_count', 'assignee_count',
            'completed_count', 'pass_rate',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
    
    def get_is_closed(self, obj):
        """任务是否已结束：手动关闭或截止时间已过"""
        from django.utils import timezone
        if obj.is_closed:
            return True
        return timezone.now() > obj.deadline


class TaskDetailSerializer(serializers.ModelSerializer):
    """Serializer for task detail view."""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    knowledge_items = TaskKnowledgeSerializer(source='task_knowledge', many=True, read_only=True)
    quizzes = TaskQuizSerializer(source='task_quizzes', many=True, read_only=True)
    assignments = TaskAssignmentSerializer(many=True, read_only=True)
    is_closed = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description',
            'deadline', 'is_closed', 'closed_at',
            'knowledge_items', 'quizzes', 'assignments',
            'created_by_name', 'created_at', 'updated_at'
        ]
    
    def get_is_closed(self, obj):
        """任务是否已结束：手动关闭或截止时间已过"""
        from django.utils import timezone
        if obj.is_closed:
            return True
        return timezone.now() > obj.deadline


class TaskCreateSerializer(serializers.Serializer):
    """
    统一的任务创建 Serializer
    
    一个任务可以包含：
    - knowledge_ids: 知识文档列表（可选）
    - quiz_ids: 试卷列表（可选）
    - 至少需要选择一个知识文档或试卷
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
        """验证知识文档ID"""
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
    
    def validate_quiz_ids(self, value):
        """验证试卷ID"""
        if not value:
            return value
        
        existing_ids = set(
            Quiz.objects.filter(
                id__in=value,
                is_deleted=False,
                status='PUBLISHED'
            ).values_list('id', flat=True)
        )
        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(f'试卷不存在: {list(invalid_ids)}')
        
        return value
    
    def validate_assignee_ids(self, value):
        """验证学员ID"""
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
        current_role = get_current_role(request.user)
        
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
    
    @transaction.atomic
    def create(self, validated_data):
        """创建任务"""
        request = self.context.get('request')
        knowledge_ids = validated_data.pop('knowledge_ids', [])
        quiz_ids = validated_data.pop('quiz_ids', [])
        assignee_ids = validated_data.pop('assignee_ids')
        
        # 创建任务
        task = Task.objects.create(
            title=validated_data['title'],
            description=validated_data.get('description', ''),
            deadline=validated_data['deadline'],
            created_by=request.user
        )
        
        # 创建知识文档关联
        if knowledge_ids:
            knowledge_queryset = Knowledge.objects.filter(
                id__in=knowledge_ids,
                is_deleted=False,
                status='PUBLISHED'
            ).select_related('created_by').prefetch_related('system_tags', 'operation_tags')
            knowledge_map = {k.id: k for k in knowledge_queryset}
            
            for order, knowledge_id in enumerate(knowledge_ids, start=1):
                knowledge = knowledge_map.get(knowledge_id)
                if not knowledge:
                    continue
                TaskKnowledge.objects.create(
                    task=task,
                    knowledge=knowledge,
                    order=order,
                    resource_uuid=knowledge.resource_uuid,
                    version_number=knowledge.version_number
                )
        
        # 创建试卷关联
        if quiz_ids:
            quiz_queryset = Quiz.objects.filter(
                id__in=quiz_ids,
                is_deleted=False,
                status='PUBLISHED'
            )
            quiz_map = {q.id: q for q in quiz_queryset}
            
            for order, quiz_id in enumerate(quiz_ids, start=1):
                quiz = quiz_map.get(quiz_id)
                if not quiz:
                    continue
                TaskQuiz.objects.create(
                    task=task,
                    quiz=quiz,
                    order=order,
                    resource_uuid=quiz.resource_uuid,
                    version_number=quiz.version_number
                )
        
        # 创建任务分配
        for assignee_id in assignee_ids:
            TaskAssignment.objects.create(
                task=task,
                assignee_id=assignee_id
            )
        
        return task


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
        """验证知识文档ID"""
        if value is None:
            return value
        
        if value:
            published_knowledge = Knowledge.objects.filter(
                id__in=value,
                is_deleted=False,
                status='PUBLISHED'
            )
            published_ids = set(published_knowledge.values_list('id', flat=True))
            
            invalid_ids = set(value) - published_ids
            if invalid_ids:
                raise serializers.ValidationError(f'以下知识文档不可用: {list(invalid_ids)}')
        
        return value
    
    def validate_quiz_ids(self, value):
        """验证试卷ID"""
        if value is None:
            return value
        
        if value:
            existing_ids = set(
                Quiz.objects.filter(
                    id__in=value,
                    is_deleted=False,
                    status='PUBLISHED'
                ).values_list('id', flat=True)
            )
            invalid_ids = set(value) - existing_ids
            if invalid_ids:
                raise serializers.ValidationError(f'以下试卷不存在: {list(invalid_ids)}')
        
        return value
    
    def validate_assignee_ids(self, value):
        """验证学员ID"""
        if value is None:
            return value
        
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
                current_role = get_current_role(request.user)
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
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """更新任务信息"""
        # 检查任务是否已关闭
        if instance.is_closed:
            raise serializers.ValidationError('任务已关闭，无法修改')
        
        # 提取关联资源字段
        knowledge_ids = validated_data.pop('knowledge_ids', None)
        quiz_ids = validated_data.pop('quiz_ids', None)
        assignee_ids = validated_data.pop('assignee_ids', None)
        
        # 更新基本字段
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # 更新关联知识文档
        if knowledge_ids is not None:
            existing_knowledge_ids = list(
                instance.task_knowledge.order_by('order').values_list('knowledge_id', flat=True)
            )
            if existing_knowledge_ids != list(knowledge_ids):
                TaskKnowledge.objects.filter(task=instance).delete()
                if knowledge_ids:
                    knowledge_queryset = Knowledge.objects.filter(
                        id__in=knowledge_ids,
                        is_deleted=False,
                        status='PUBLISHED'
                    ).select_related('created_by').prefetch_related('system_tags', 'operation_tags')
                    knowledge_map = {k.id: k for k in knowledge_queryset}
                    for order, kid in enumerate(knowledge_ids, start=1):
                        knowledge = knowledge_map.get(kid)
                        if knowledge:
                            TaskKnowledge.objects.create(
                                task=instance,
                                knowledge=knowledge,
                                order=order,
                                resource_uuid=knowledge.resource_uuid,
                                version_number=knowledge.version_number
                            )
        
        # 更新关联试卷
        if quiz_ids is not None:
            existing_quiz_ids = list(
                instance.task_quizzes.order_by('order').values_list('quiz_id', flat=True)
            )
            if existing_quiz_ids != list(quiz_ids):
                TaskQuiz.objects.filter(task=instance).delete()
                if quiz_ids:
                    quiz_queryset = Quiz.objects.filter(
                        id__in=quiz_ids,
                        is_deleted=False,
                        status='PUBLISHED'
                    )
                    quiz_map = {q.id: q for q in quiz_queryset}
                    for order, qid in enumerate(quiz_ids, start=1):
                        quiz = quiz_map.get(qid)
                        if quiz:
                            TaskQuiz.objects.create(
                                task=instance,
                                quiz=quiz,
                                order=order,
                                resource_uuid=quiz.resource_uuid,
                                version_number=quiz.version_number
                            )
        
        # 更新分配学员
        if assignee_ids is not None:
            existing_assignee_ids = set(
                TaskAssignment.objects.filter(task=instance).values_list('assignee_id', flat=True)
            )
            new_assignee_ids = set(assignee_ids)
            
            # 删除不再分配的学员
            to_remove = existing_assignee_ids - new_assignee_ids
            if to_remove:
                TaskAssignment.objects.filter(
                    task=instance,
                    assignee_id__in=to_remove
                ).delete()
            
            # 添加新分配的学员
            to_add = new_assignee_ids - existing_assignee_ids
            for assignee_id in to_add:
                TaskAssignment.objects.create(
                    task=instance,
                    assignee_id=assignee_id
                )
        
        return instance


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
        return obj.task.task_quizzes.exists()
    
    def get_has_knowledge(self, obj):
        return obj.task.task_knowledge.exists()
    
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
        """获取知识文档及其学习进度"""
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
                'summary': self._extract_summary(knowledge),
                'order': tk.order,
                'is_completed': progress.is_completed if progress else False,
                'completed_at': progress.completed_at if progress else None,
            }
            result.append(item)
        
        return sorted(result, key=lambda x: x['order'])
    
    def _extract_summary(self, knowledge):
        """从知识文档中提取摘要"""
        if knowledge.knowledge_type == 'OTHER':
            text = knowledge.content or ''
        else:
            parts = [
                knowledge.fault_scenario,
                knowledge.trigger_process,
                knowledge.solution,
                knowledge.verification_plan,
                knowledge.recovery_plan,
            ]
            text = next((p for p in parts if p), '')
        return text[:160] if text else ''
    
    def get_quiz_items(self, obj):
        """获取试卷列表及提交状态"""
        from apps.submissions.models import Submission
        task_quiz_items = obj.task.task_quizzes.select_related('quiz').all()
        
        # 获取学员对这些试卷的最近/最高分提交
        all_submissions = Submission.objects.filter(
            task_assignment=obj,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        )
        
        # 按 quiz 分类
        submission_map = {}
        for s in all_submissions:
            if s.quiz_id not in submission_map:
                submission_map[s.quiz_id] = []
            submission_map[s.quiz_id].append(s)
        
        result = []
        for tq in task_quiz_items:
            quiz = tq.quiz
            quiz_subs = submission_map.get(quiz.id, [])
            
            is_completed = len(quiz_subs) > 0
            best_sub = max(quiz_subs, key=lambda x: x.obtained_score or 0) if is_completed else None
            latest_sub = max(quiz_subs, key=lambda x: x.submitted_at) if is_completed else None
            
            item = {
                'id': tq.id,
                'quiz': quiz.id, # 保持与管理端一致，返回 quiz ID
                'quiz_id': quiz.id,
                'quiz_title': quiz.title,
                'quiz_type': quiz.quiz_type,
                'quiz_type_display': quiz.get_quiz_type_display(),
                'description': quiz.description,
                'question_count': quiz.question_count,
                'total_score': float(quiz.total_score) if quiz.total_score else 0,
                'duration': quiz.duration,
                'pass_score': float(quiz.pass_score) if quiz.pass_score else None,
                'order': tq.order,
                'is_completed': is_completed,
                'score': float(best_sub.obtained_score) if best_sub and best_sub.obtained_score is not None else None,
                'latest_submission_id': latest_sub.id if latest_sub else None,
                'latest_status': latest_sub.status if latest_sub else None,
            }
            result.append(item)
        
        return sorted(result, key=lambda x: x['order'])


class CompleteKnowledgeLearningSerializer(serializers.Serializer):
    """Serializer for completing knowledge learning."""
    knowledge_id = serializers.IntegerField(
        help_text='要标记为已学习的知识文档ID'
    )
    
    def validate_knowledge_id(self, value):
        """Validate that the knowledge ID exists."""
        if not Knowledge.objects.filter(id=value, is_deleted=False).exists():
            raise serializers.ValidationError('知识文档不存在')
        return value


# 保留旧的命名以保持向后兼容（但实际上会重定向到新的）
LearningTaskCreateSerializer = TaskCreateSerializer
PracticeTaskCreateSerializer = TaskCreateSerializer
ExamTaskCreateSerializer = TaskCreateSerializer
StudentLearningTaskDetailSerializer = StudentTaskDetailSerializer
