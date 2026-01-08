"""
Task models for LMS.
Implements:
- Task: 任务主模型
- TaskAssignment: 任务分配记录
- TaskKnowledge: 任务与知识文档的关联
- TaskQuiz: 任务与试卷的关联
重构说明：
- 移除 task_type 字段，任务不再区分类型
- 一个任务可以包含任意组合的知识文档和试卷
- 简化任务状态逻辑
"""
import uuid
from django.db import models
from django.utils import timezone
from core.mixins import TimestampMixin, SoftDeleteMixin, CreatorMixin
class Task(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    任务主模型
    重构后的任务模型：
    - 不再区分任务类型
    - 一个任务可以包含任意数量的知识文档和试卷
    - 学员需要完成所有关联的资源才算完成任务
    """
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
    # 时间设置
    deadline = models.DateTimeField(
        verbose_name='截止时间'
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
        return self.title
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
    @property
    def completed_count(self):
        """获取已完成学员数量"""
        return self.assignments.filter(status='COMPLETED').count()
    @property
    def has_quiz(self):
        """任务是否包含试卷"""
        return self.quiz_count > 0
    @property
    def has_knowledge(self):
        """任务是否包含知识文档"""
        return self.knowledge_count > 0
    @property
    def pass_rate(self):
        """
        获取完成率（百分比）
        计算公式：已完成数/总分配数
        """
        total = self.assignments.count()
        if total == 0:
            return None
        completed = self.assignments.filter(status='COMPLETED').count()
        return round(completed / total * 100, 1)
    def close(self):
        """
        强制结束任务
        """
        self.is_closed = True
        self.closed_at = timezone.now()
        self.save(update_fields=['is_closed', 'closed_at'])
        # 将未完成的分配记录标记为已逾期
        self.assignments.filter(
            status='IN_PROGRESS'
        ).update(status='OVERDUE')
class TaskAssignment(TimestampMixin, models.Model):
    """
    任务分配记录模型
    记录任务分配给每个学员的状态和进度。
    状态:
    - IN_PROGRESS: 进行中
    - COMPLETED: 已完成
    - OVERDUE: 已逾期
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', '进行中'),
        ('COMPLETED', '已完成'),
        ('OVERDUE', '已逾期'),
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
    # 综合成绩（如果任务包含试卷）
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
        """检查并更新逾期状态"""
        if self.is_overdue and self.status not in ['COMPLETED', 'OVERDUE']:
            self.mark_overdue()
    def get_progress_data(self):
        """
        计算详细进度数据，包括知识点和测验。
        """
        task = self.task
        total_knowledge = task.task_knowledge.count()
        total_quizzes = task.task_quizzes.count()
        total = total_knowledge + total_quizzes
        if total == 0:
            return {
                'completed': 0,
                'total': 0,
                'percentage': 100,
                'knowledge_total': 0,
                'knowledge_completed': 0,
                'quiz_total': 0,
                'quiz_completed': 0
            }
        # 1. 知识文档进度
        completed_knowledge = self.knowledge_progress.filter(is_completed=True).count()
        # 2. 试卷完成统计
        # 每个关联的试卷只要有至少一个非答题中的 submission 就算该项完成
        from apps.submissions.models import Submission
        completed_quizzes = Submission.objects.filter(
            task_assignment=self,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).values('quiz_id').distinct().count()
        completed = completed_knowledge + completed_quizzes
        return {
            'completed': completed,
            'total': total,
            'knowledge_total': total_knowledge,
            'knowledge_completed': completed_knowledge,
            'quiz_total': total_quizzes,
            'quiz_completed': completed_quizzes,
            'percentage': round(completed / total * 100, 1)
        }
    def check_completion(self):
        """
        检查并更新任务完成状态。
        如果所有子项（知识点+测验）都已完成，则标记任务为已完成。
        """
        progress = self.get_progress_data()
        if progress['completed'] >= progress['total'] and progress['total'] > 0:
            if self.status != 'COMPLETED':
                self.mark_completed()
            return True
        return False
class TaskKnowledge(TimestampMixin, models.Model):
    """
    任务与知识文档的关联模型
    通过 resource_uuid + version_number 关联到特定版本的知识文档。
    不再存储 snapshot，直接从 Knowledge 表查询版本数据。
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_knowledge',
        verbose_name='任务'
    )
    knowledge = models.ForeignKey(
        'knowledge.Knowledge',
        on_delete=models.PROTECT,
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
        return f"{self.task.title} - {self.knowledge.title}"
    def save(self, *args, **kwargs):
        """保存时自动设置版本号和顺序号"""
        if self.knowledge:
            if not self.resource_uuid:
                self.resource_uuid = self.knowledge.resource_uuid
            if not self.version_number:
                self.version_number = self.knowledge.version_number
        if not self.order:
            max_order = TaskKnowledge.objects.filter(
                task=self.task
            ).aggregate(
                max_order=models.Max('order')
            )['max_order']
            self.order = (max_order or 0) + 1
        super().save(*args, **kwargs)
    def get_versioned_knowledge(self):
        """获取任务创建时版本的知识文档"""
        from apps.knowledge.models import Knowledge
        return Knowledge.objects.filter(
            resource_uuid=self.resource_uuid,
            version_number=self.version_number
        ).first() or self.knowledge
class TaskQuiz(TimestampMixin, models.Model):
    """
    任务与试卷的关联模型
    通过 resource_uuid + version_number 关联到特定版本的试卷。
    不再存储 snapshot，直接从 Quiz 表查询版本数据。
    """
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_quizzes',
        verbose_name='任务'
    )
    quiz = models.ForeignKey(
        'quizzes.Quiz',
        on_delete=models.PROTECT,
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
        return f"{self.task.title} - {self.quiz.title}"
    def save(self, *args, **kwargs):
        """保存时自动设置版本号和顺序号"""
        if self.quiz:
            if not self.resource_uuid:
                self.resource_uuid = self.quiz.resource_uuid
            if not self.version_number:
                self.version_number = self.quiz.version_number
        if not self.order:
            max_order = TaskQuiz.objects.filter(
                task=self.task
            ).aggregate(
                max_order=models.Max('order')
            )['max_order']
            self.order = (max_order or 0) + 1
        super().save(*args, **kwargs)
    def get_versioned_quiz(self):
        """获取任务创建时版本的试卷"""
        from apps.quizzes.models import Quiz
        return Quiz.objects.filter(
            resource_uuid=self.resource_uuid,
            version_number=self.version_number
        ).first() or self.quiz
class KnowledgeLearningProgress(TimestampMixin, models.Model):
    """
    知识学习进度模型
    记录学员在任务中对每个知识文档的学习状态。
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
        title = self.task_knowledge.knowledge.title
        return f"{self.assignment} - {title} ({status})"
    def mark_completed(self):
        """标记知识学习为已完成"""
        if not self.is_completed:
            self.is_completed = True
            self.completed_at = timezone.now()
            self.save(update_fields=['is_completed', 'completed_at'])
            # 检查是否所有知识都已完成，如果是则自动完成任务
            self._check_task_completion()
    def _check_task_completion(self):
        """检查任务是否应该自动完成"""
        self.assignment.check_completion()
