"""任务模型。

任务发布时不会直接绑定当前知识/试卷，而是通过 `TaskKnowledge/TaskQuiz` 绑定
执行期快照；`source_*` 字段只保留来源追踪，方便任务编辑和后台排查。
"""

from django.db import models
from django.utils import timezone

from core.mixins import CreatorMixin, TimestampMixin

class Task(TimestampMixin, CreatorMixin, models.Model):
    """任务主表，只保存任务元信息和截止时间。"""

    title = models.CharField(max_length=200, verbose_name='任务标题')
    description = models.TextField(blank=True, default='', verbose_name='任务描述')
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
        verbose_name='创建时角色',
    )
    deadline = models.DateTimeField(verbose_name='截止时间')
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_updated',
        verbose_name='最后更新者',
    )
    knowledge_items = models.ManyToManyField(
        'knowledge.KnowledgeRevision',
        through='TaskKnowledge',
        related_name='tasks',
        verbose_name='关联知识快照',
    )
    quizzes = models.ManyToManyField(
        'quizzes.QuizRevision',
        through='TaskQuiz',
        related_name='tasks',
        verbose_name='关联试卷快照',
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
        return self.task_quizzes.count()

    @property
    def knowledge_count(self):
        return self.task_knowledge.count()

    @property
    def exam_count(self):
        return self.task_quizzes.filter(quiz__quiz_type='EXAM').count()

    @property
    def practice_count(self):
        return self.task_quizzes.filter(quiz__quiz_type='PRACTICE').count()

    @property
    def assignee_count(self):
        return self.assignments.count()

    @property
    def completed_count(self):
        return self.assignments.filter(status='COMPLETED').count()

    @property
    def has_quiz(self):
        return self.quiz_count > 0

    @property
    def has_knowledge(self):
        return self.knowledge_count > 0

    @property
    def has_student_progress(self):
        """判断任务是否已有执行痕迹。

        一旦学员完成知识或产生答卷，任务资源和已分配学员就不能再被破坏性移除。
        """
        if KnowledgeLearningProgress.objects.filter(
            assignment__task_id=self.id,
            is_completed=True,
        ).exists():
            return True
        from apps.submissions.models import Submission

        return Submission.objects.filter(task_assignment__task_id=self.id).exists()


class TaskAssignment(TimestampMixin, models.Model):
    """任务分配记录。"""

    STATUS_CHOICES = [
        ('IN_PROGRESS', '进行中'),
        ('COMPLETED', '已完成'),
        ('OVERDUE', '已逾期'),
    ]

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name='任务',
    )
    assignee = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='task_assignments',
        verbose_name='学员',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='IN_PROGRESS',
        verbose_name='状态',
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='成绩',
    )

    class Meta:
        db_table = 'lms_task_assignment'
        verbose_name = '任务分配'
        verbose_name_plural = '任务分配'
        ordering = ['task', '-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['task', 'assignee'],
                name='uniq_task_assignment_assignee',
            ),
        ]

    def __str__(self):
        return f'{self.task.title} - {self.assignee.username}'

    def mark_completed(self, score=None):
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        if score is not None:
            self.score = score
        self.save(update_fields=['status', 'completed_at', 'score'])

    def mark_overdue(self):
        if self.status != 'COMPLETED':
            self.status = 'OVERDUE'
            self.save(update_fields=['status'])

    @property
    def is_overdue(self):
        if self.status == 'COMPLETED':
            return False
        return timezone.now() > self.task.deadline

class TaskKnowledge(TimestampMixin, models.Model):
    """任务与知识快照的关联。

    `knowledge` 是执行期读取的冻结快照；`source_knowledge` 是资源中心当前对象，
    只用于编辑任务时还原选择列表。
    """

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_knowledge',
        verbose_name='任务',
    )
    knowledge = models.ForeignKey(
        'knowledge.KnowledgeRevision',
        on_delete=models.PROTECT,
        related_name='knowledge_tasks',
        verbose_name='知识快照',
    )
    source_knowledge = models.ForeignKey(
        'knowledge.Knowledge',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_bindings',
        verbose_name='来源知识',
    )
    order = models.PositiveIntegerField(default=1, verbose_name='顺序')

    class Meta:
        db_table = 'lms_task_knowledge'
        verbose_name = '任务知识关联'
        verbose_name_plural = '任务知识关联'
        ordering = ['task', 'order']
        constraints = [
            models.UniqueConstraint(
                fields=['task', 'order'],
                name='uniq_task_knowledge_order',
            ),
        ]

    def __str__(self):
        return f'{self.task.title} - {self.knowledge.title}'


class TaskQuiz(TimestampMixin, models.Model):
    """任务与试卷快照的关联。

    答题、评分、统计都读 `quiz` 指向的快照，避免资源中心后续编辑影响已发布任务。
    """

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='task_quizzes',
        verbose_name='任务',
    )
    quiz = models.ForeignKey(
        'quizzes.QuizRevision',
        on_delete=models.PROTECT,
        related_name='quiz_tasks',
        verbose_name='试卷快照',
    )
    source_quiz = models.ForeignKey(
        'quizzes.Quiz',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='task_bindings',
        verbose_name='来源试卷',
    )
    order = models.PositiveIntegerField(default=1, verbose_name='顺序')

    class Meta:
        db_table = 'lms_task_quiz'
        verbose_name = '任务试卷关联'
        verbose_name_plural = '任务试卷关联'
        ordering = ['task', 'order']
        constraints = [
            models.UniqueConstraint(
                fields=['task', 'order'],
                name='uniq_task_quiz_order',
            ),
        ]

    def __str__(self):
        return f'{self.task.title} - {self.quiz.title}'


class KnowledgeLearningProgress(TimestampMixin, models.Model):
    """知识学习进度。"""

    assignment = models.ForeignKey(
        TaskAssignment,
        on_delete=models.CASCADE,
        related_name='knowledge_progress',
        verbose_name='任务分配',
    )
    task_knowledge = models.ForeignKey(
        TaskKnowledge,
        on_delete=models.CASCADE,
        related_name='learning_progress',
        verbose_name='任务知识',
    )
    is_completed = models.BooleanField(default=False, verbose_name='是否完成')
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name='完成时间')

    class Meta:
        db_table = 'lms_knowledge_learning_progress'
        verbose_name = '知识学习进度'
        verbose_name_plural = '知识学习进度'
        ordering = ['assignment', 'task_knowledge__order']
        constraints = [
            models.UniqueConstraint(
                fields=['assignment', 'task_knowledge'],
                name='uniq_assignment_task_knowledge',
            ),
        ]

    def __str__(self):
        status = '已完成' if self.is_completed else '未完成'
        return f'{self.assignment} - {self.task_knowledge.knowledge.title} ({status})'
