"""
Task models for LMS.

Implements:
- Task: 任务主模型
- TaskAssignment: 任务分配记录
- TaskKnowledge: 任务与知识文档的关联
- TaskQuiz: 任务与试卷的关联

Requirements: 7.1, 9.1, 11.1
"""
import uuid

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.mixins import TimestampMixin, SoftDeleteMixin, CreatorMixin


class Task(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    任务主模型
    
    任务类型:
    - LEARNING: 学习任务 - 指派学员学习指定知识文档
    - PRACTICE: 练习任务 - 指派学员完成试卷练习，可重复提交
    - EXAM: 考试任务 - 正式考核，仅允许一次作答
    
    Requirements:
    - 7.1: 创建学习任务时要求选择知识文档和目标学员
    - 9.1: 创建练习任务时要求选择试卷、可选关联知识文档和目标学员
    - 11.1: 创建考试任务时要求选择唯一试卷、设置考试时间窗口、限时和目标学员
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    - Property 27: 考试任务唯一试卷
    """
    TASK_TYPE_CHOICES = [
        ('LEARNING', '学习任务'),
        ('PRACTICE', '练习任务'),
        ('EXAM', '考试任务'),
    ]
    
    # 基础信息
    title = models.CharField(
        max_length=200,
        verbose_name='任务标题'
    )
    description = models.TextField(
        blank=True,
        default='',
        verbose_name='任务描述'
    )
    task_type = models.CharField(
        max_length=20,
        choices=TASK_TYPE_CHOICES,
        verbose_name='任务类型'
    )
    
    # 时间设置
    deadline = models.DateTimeField(
        verbose_name='截止时间'
    )
    
    # 考试任务专用字段
    start_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='考试开始时间'
    )
    duration = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='考试时长（分钟）'
    )
    pass_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='及格分数'
    )
    
    # 任务状态（任务级别，非分配级别）
    is_closed = models.BooleanField(
        default=False,
        verbose_name='是否已结束'
    )
    closed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='结束时间'
    )
    
    # 关联知识文档（多对多）
    knowledge_items = models.ManyToManyField(
        'knowledge.Knowledge',
        through='TaskKnowledge',
        related_name='tasks',
        verbose_name='关联知识'
    )
    
    # 关联试卷（多对多）
    quizzes = models.ManyToManyField(
        'quizzes.Quiz',
        through='TaskQuiz',
        related_name='tasks',
        verbose_name='关联试卷'
    )
    
    class Meta:
        db_table = 'lms_task'
        verbose_name = '任务'
        verbose_name_plural = '任务'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[{self.get_task_type_display()}] {self.title}"
    
    def clean(self):
        """
        验证任务数据:
        - 考试任务必须设置开始时间、时长和及格分数
        - 考试开始时间必须早于截止时间
        """
        super().clean()
        
        if self.task_type == 'EXAM':
            if not self.start_time:
                raise ValidationError({'start_time': '考试任务必须设置开始时间'})
            if not self.duration:
                raise ValidationError({'duration': '考试任务必须设置考试时长'})
            if self.pass_score is None:
                raise ValidationError({'pass_score': '考试任务必须设置及格分数'})
            if self.start_time and self.deadline and self.start_time >= self.deadline:
                raise ValidationError({'start_time': '考试开始时间必须早于截止时间'})
    
    @property
    def is_exam(self):
        """是否为考试任务"""
        return self.task_type == 'EXAM'
    
    @property
    def is_practice(self):
        """是否为练习任务"""
        return self.task_type == 'PRACTICE'
    
    @property
    def is_learning(self):
        """是否为学习任务"""
        return self.task_type == 'LEARNING'
    
    @property
    def is_in_exam_window(self):
        """
        检查当前时间是否在考试时间窗口内
        
        Property 28: 考试时间窗口控制
        """
        if not self.is_exam:
            return False
        now = timezone.now()
        return self.start_time <= now <= self.deadline
    
    @property
    def quiz_count(self):
        """获取关联试卷数量"""
        return self.task_quizzes.count()
    
    @property
    def knowledge_count(self):
        """获取关联知识文档数量"""
        return self.task_knowledge.count()
    
    @property
    def assignee_count(self):
        """获取分配学员数量"""
        return self.assignments.count()
    
    def close(self):
        """
        强制结束任务
        
        Requirements: 7.6, 20.3
        """
        self.is_closed = True
        self.closed_at = timezone.now()
        self.save(update_fields=['is_closed', 'closed_at'])
        
        # 将未完成的分配记录标记为已逾期
        self.assignments.filter(
            status__in=['IN_PROGRESS', 'PENDING_EXAM']
        ).update(status='OVERDUE')
    
    def validate_exam_single_quiz(self):
        """
        验证考试任务只能有一个试卷
        
        Property 27: 考试任务唯一试卷
        """
        if self.is_exam and self.quiz_count != 1:
            raise ValidationError('考试任务必须且只能关联一个试卷')


class TaskAssignment(TimestampMixin, models.Model):
    """
    任务分配记录模型
    
    记录任务分配给每个学员的状态和进度。
    
    状态:
    - IN_PROGRESS: 进行中
    - COMPLETED: 已完成
    - OVERDUE: 已逾期
    - PENDING_EXAM: 待考试（仅考试任务）
    
    Requirements:
    - 7.5: 学习任务创建成功后为每个学员创建任务分配记录，初始状态为"进行中"
    - 9.5: 练习任务创建成功后为每个学员创建任务分配记录，初始状态为"进行中"
    - 11.6: 考试任务创建成功后为每个学员创建任务分配记录，初始状态为"待考试"
    
    Properties:
    - Property 19: 任务分配记录完整性
    - Property 21: 学习任务自动完成
    - Property 23: 任务逾期状态标记
    - Property 25: 练习任务自动完成
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', '进行中'),
        ('COMPLETED', '已完成'),
        ('OVERDUE', '已逾期'),
        ('PENDING_EXAM', '待考试'),
    ]
    
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name='任务'
    )
    assignee = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='task_assignments',
        verbose_name='学员'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS',
        verbose_name='状态'
    )
    
    # 完成信息
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='完成时间'
    )
    
    # 考试/练习成绩
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='成绩'
    )
    
    class Meta:
        db_table = 'lms_task_assignment'
        verbose_name = '任务分配'
        verbose_name_plural = '任务分配'
        unique_together = ['task', 'assignee']
        ordering = ['task', '-created_at']
    
    def __str__(self):
        return f"{self.task.title} - {self.assignee.username}"
    
    def save(self, *args, **kwargs):
        """
        保存时设置默认状态
        
        Requirements:
        - 7.5: 学习任务初始状态为"进行中"
        - 9.5: 练习任务初始状态为"进行中"
        - 11.6: 考试任务初始状态为"待考试"
        """
        if not self.pk:  # 新建记录
            if self.task.task_type == 'EXAM':
                self.status = 'PENDING_EXAM'
            else:
                self.status = 'IN_PROGRESS'
        super().save(*args, **kwargs)
    
    def mark_completed(self, score=None):
        """
        标记任务为已完成
        
        Args:
            score: 可选的成绩
        """
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        if score is not None:
            self.score = score
        self.save(update_fields=['status', 'completed_at', 'score'])
    
    def mark_overdue(self):
        """
        标记任务为已逾期
        
        Property 23: 任务逾期状态标记
        """
        if self.status not in ['COMPLETED']:
            self.status = 'OVERDUE'
            self.save(update_fields=['status'])
    
    @property
    def is_overdue(self):
        """检查任务是否已逾期"""
        if self.status == 'COMPLETED':
            return False
        return timezone.now() > self.task.deadline
    
    def check_and_update_overdue(self):
        """
        检查并更新逾期状态
        
        Property 23: 任务逾期状态标记
        """
        if self.is_overdue and self.status not in ['COMPLETED', 'OVERDUE']:
            self.mark_overdue()


class TaskKnowledge(TimestampMixin, models.Model):
    """
    任务与知识文档的关联模型
    
    记录任务关联的知识文档及学习状态。
    
    Requirements:
    - 7.1: 学习任务选择知识文档（可多选）
    - 9.1: 练习任务可选关联知识文档
    
    Properties:
    - Property 12: 被引用知识删除保护
    - Property 20: 知识学习完成记录
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_knowledge',
        verbose_name='任务'
    )
    knowledge = models.ForeignKey(
        'knowledge.Knowledge',
        on_delete=models.PROTECT,  # 保护删除，防止删除被引用的知识
        related_name='knowledge_tasks',
        verbose_name='知识文档'
    )
    resource_uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        verbose_name='知识资源ID'
    )
    version_number = models.PositiveIntegerField(
        default=1,
        verbose_name='知识版本号'
    )
    snapshot = models.JSONField(
        default=dict,
        verbose_name='知识快照'
    )
    order = models.PositiveIntegerField(
        default=1,
        verbose_name='顺序'
    )
    
    class Meta:
        db_table = 'lms_task_knowledge'
        verbose_name = '任务知识关联'
        verbose_name_plural = '任务知识关联'
        unique_together = ['task', 'knowledge']
        ordering = ['task', 'order']
    
    def __str__(self):
        title = self.snapshot.get('title') or self.knowledge.title
        return f"{self.task.title} - {title}"
    
    def save(self, *args, **kwargs):
        """保存时自动设置顺序号"""
        if self.knowledge:
            if not self.resource_uuid:
                self.resource_uuid = self.knowledge.resource_uuid
            if not self.version_number:
                self.version_number = self.knowledge.version_number
            if not self.snapshot:
                self.snapshot = self.build_snapshot(self.knowledge)
        if not self.order:
            max_order = TaskKnowledge.objects.filter(
                task=self.task
            ).aggregate(
                max_order=models.Max('order')
            )['max_order']
            self.order = (max_order or 0) + 1
        super().save(*args, **kwargs)
    
    @staticmethod
    def _extract_summary(snapshot_source):
        if snapshot_source.knowledge_type == 'OTHER':
            text = snapshot_source.content or ''
        else:
            parts = [
                snapshot_source.fault_scenario,
                snapshot_source.trigger_process,
                snapshot_source.solution,
                snapshot_source.verification_plan,
                snapshot_source.recovery_plan,
            ]
            text = next((p for p in parts if p), '')
        return text[:160] if text else ''
    
    @staticmethod
    def build_snapshot(knowledge):
        line_type = knowledge.line_type
        return {
            'id': knowledge.id,
            'resource_uuid': str(knowledge.resource_uuid),
            'version_number': knowledge.version_number,
            'title': knowledge.title,
            'knowledge_type': knowledge.knowledge_type,
            'knowledge_type_display': knowledge.get_knowledge_type_display(),
            'summary': TaskKnowledge._extract_summary(knowledge),
            'content': knowledge.content,
            'fault_scenario': knowledge.fault_scenario,
            'trigger_process': knowledge.trigger_process,
            'solution': knowledge.solution,
            'verification_plan': knowledge.verification_plan,
            'recovery_plan': knowledge.recovery_plan,
            'line_type': {
                'id': line_type.id,
                'name': line_type.name,
            } if line_type else None,
            'system_tags': [
                {'id': tag.id, 'name': tag.name}
                for tag in knowledge.system_tags.all()
            ],
            'operation_tags': [
                {'id': tag.id, 'name': tag.name}
                for tag in knowledge.operation_tags.all()
            ],
        }


class TaskQuiz(TimestampMixin, models.Model):
    """
    任务与试卷的关联模型
    
    记录任务关联的试卷。
    
    Requirements:
    - 9.1: 练习任务选择试卷（可多选）
    - 11.1: 考试任务选择唯一试卷
    
    Properties:
    - Property 14: 被引用试卷删除保护
    - Property 27: 考试任务唯一试卷
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_quizzes',
        verbose_name='任务'
    )
    quiz = models.ForeignKey(
        'quizzes.Quiz',
        on_delete=models.PROTECT,  # 保护删除，防止删除被引用的试卷
        related_name='quiz_tasks',
        verbose_name='试卷'
    )
    resource_uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        verbose_name='试卷资源ID'
    )
    version_number = models.PositiveIntegerField(
        default=1,
        verbose_name='试卷版本号'
    )
    snapshot = models.JSONField(
        default=dict,
        verbose_name='试卷快照'
    )
    order = models.PositiveIntegerField(
        default=1,
        verbose_name='顺序'
    )
    
    class Meta:
        db_table = 'lms_task_quiz'
        verbose_name = '任务试卷关联'
        verbose_name_plural = '任务试卷关联'
        unique_together = ['task', 'quiz']
        ordering = ['task', 'order']
    
    def __str__(self):
        title = self.snapshot.get('title') or self.quiz.title
        return f"{self.task.title} - {title}"
    
    def save(self, *args, **kwargs):
        """保存时自动设置顺序号"""
        if self.quiz:
            if not self.resource_uuid:
                self.resource_uuid = self.quiz.resource_uuid
            if not self.version_number:
                self.version_number = self.quiz.version_number
            if not self.snapshot:
                self.snapshot = self.build_snapshot(self.quiz)
        if not self.order:
            max_order = TaskQuiz.objects.filter(
                task=self.task
            ).aggregate(
                max_order=models.Max('order')
            )['max_order']
            self.order = (max_order or 0) + 1
        super().save(*args, **kwargs)
    
    def clean(self):
        """
        验证考试任务只能有一个试卷
        
        Property 27: 考试任务唯一试卷
        """
        super().clean()
        if self.task.task_type == 'EXAM':
            existing_count = TaskQuiz.objects.filter(task=self.task).exclude(pk=self.pk).count()
            if existing_count >= 1:
                raise ValidationError('考试任务只能关联一个试卷')
    
    @staticmethod
    def build_snapshot(quiz):
        questions = []
        for relation in quiz.get_ordered_questions():
            question = relation.question
            questions.append({
                'id': question.id,
                'resource_uuid': str(question.resource_uuid),
                'version_number': question.version_number,
                'content': question.content,
                'question_type': question.question_type,
                'options': question.options,
                'answer': question.answer,
                'explanation': question.explanation,
                'score': float(question.score),
                'order': relation.order,
            })
        return {
            'id': quiz.id,
            'resource_uuid': str(quiz.resource_uuid),
            'version_number': quiz.version_number,
            'title': quiz.title,
            'description': quiz.description,
            'question_count': quiz.question_count,
            'total_score': float(quiz.total_score) if quiz.total_score else 0,
            'has_subjective_questions': quiz.has_subjective_questions,
            'questions': questions,
        }


class KnowledgeLearningProgress(TimestampMixin, models.Model):
    """
    知识学习进度模型
    
    记录学员在任务中对每个知识文档的学习状态。
    
    Requirements:
    - 8.3: 学员点击「我已学习掌握」时记录完成状态和完成时间
    - 8.4: 学员查看已完成的知识子任务时展示完成时间
    
    Properties:
    - Property 20: 知识学习完成记录
    - Property 21: 学习任务自动完成
    """
    assignment = models.ForeignKey(
        TaskAssignment,
        on_delete=models.CASCADE,
        related_name='knowledge_progress',
        verbose_name='任务分配'
    )
    task_knowledge = models.ForeignKey(
        TaskKnowledge,
        on_delete=models.CASCADE,
        related_name='learning_progress',
        verbose_name='任务知识'
    )
    is_completed = models.BooleanField(
        default=False,
        verbose_name='是否完成'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='完成时间'
    )
    
    class Meta:
        db_table = 'lms_knowledge_learning_progress'
        verbose_name = '知识学习进度'
        verbose_name_plural = '知识学习进度'
        unique_together = ['assignment', 'task_knowledge']
        ordering = ['assignment', 'task_knowledge__order']
    
    def __str__(self):
        status = '已完成' if self.is_completed else '未完成'
        title = self.task_knowledge.snapshot.get('title') or self.task_knowledge.knowledge.title
        return f"{self.assignment} - {title} ({status})"
    
    def mark_completed(self):
        """
        标记知识学习为已完成
        
        Property 20: 知识学习完成记录
        """
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()
            self.save(update_fields=['is_completed', 'completed_at'])
            
            # 检查是否所有知识都已完成，如果是则自动完成任务
            self._check_task_completion()
    
    def _check_task_completion(self):
        """
        检查任务是否应该自动完成
        
        Property 21: 学习任务自动完成
        """
        assignment = self.assignment
        task = assignment.task
        
        # 只有学习任务才自动完成
        if task.task_type != 'LEARNING':
            return
        
        # 检查所有知识是否都已完成
        total_knowledge = task.task_knowledge.count()
        completed_knowledge = assignment.knowledge_progress.filter(
            is_completed=True
        ).count()
        
        if total_knowledge > 0 and completed_knowledge >= total_knowledge:
            assignment.mark_completed()
