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
from django.db import models
from django.utils import timezone

from core.mixins import CreatorMixin, SoftDeleteMixin, TimestampMixin
from .progress import build_assignment_progress, is_assignment_completed


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
    created_role = models.CharField(
        max_length=20,
        choices=[
            ('ADMIN', '管理员'),
            ('MENTOR', '导师'),
            ('DEPT_MANAGER', '室经理'),
            ('TEAM_MANAGER', '团队经理'),
            ('STUDENT', '学员'),
        ],
        default='ADMIN',
        db_index=True,
        verbose_name='创建时角色'
    )
    # 时间设置
    deadline = models.DateTimeField(
        verbose_name='截止时间'
    )
    # 最后更新者
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_updated',
        verbose_name='最后更新者'
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
    def exam_count(self):
        """获取考试数量"""
        return self.task_quizzes.filter(quiz__quiz_type='EXAM').count()
    @property
    def practice_count(self):
        """获取练习数量"""
        return self.task_quizzes.filter(quiz__quiz_type='PRACTICE').count()
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
    def has_student_progress(self):
        """任务是否已有学员学习或答题进度"""
        if KnowledgeLearningProgress.objects.filter(
            assignment__task_id=self.id,
            is_completed=True,
        ).exists():
            return True
        from apps.submissions.models import Submission
        return Submission.objects.filter(task_assignment__task_id=self.id).exists()

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
        return build_assignment_progress(self)
    def check_completion(self):
        """
        检查并更新任务完成状态。
        如果所有子项（知识点+测验）都已完成，则标记任务为已完成。
        """
        progress = self.get_progress_data()
        if is_assignment_completed(progress):
            if self.status != 'COMPLETED':
                self.mark_completed()
            return True
        return False
class TaskKnowledge(TimestampMixin, models.Model):
    """
    任务与知识文档的关联模型
    通过 FK 直接关联到特定版本的知识文档记录。
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
class TaskQuiz(TimestampMixin, models.Model):
    """
    任务与试卷的关联模型
    通过 FK 直接关联到特定版本的试卷记录。
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
