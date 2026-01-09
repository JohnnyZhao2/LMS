"""
Quiz models for LMS.
Implements:
- Quiz: 试卷模型
- QuizQuestion: 试卷题目关联模型
"""
import uuid
from django.db import models
from django.db.models import Q
from core.mixins import TimestampMixin, SoftDeleteMixin, CreatorMixin
class Quiz(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    试卷模型
    试卷是题目的容器，不包含考试规则（考试规则在任务中设置）。
    Properties:
    - Property 14: 被引用试卷删除保护
    - Property 16: 试卷所有权编辑控制
    """
    # 试卷名称
    title = models.CharField(
        max_length=200,
        verbose_name='试卷名称'
    )
    # 试卷描述
    description = models.TextField(
        blank=True,
        default='',
        verbose_name='试卷描述'
    )
    # 题目（通过 QuizQuestion 中间表关联）
    questions = models.ManyToManyField(
        'questions.Question',
        through='QuizQuestion',
        through_fields=('quiz', 'question'),
        related_name='quizzes',
        verbose_name='题目'
    )
    resource_uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        db_index=True,
        verbose_name='资源标识'
    )
    version_number = models.PositiveIntegerField(
        default=1,
        verbose_name='版本号'
    )
    source_version = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_versions',
        verbose_name='来源版本'
    )
    is_current = models.BooleanField(
        default=True,
        verbose_name='是否当前版本'
    )
    QUIZ_TYPE_CHOICES = [
        ('PRACTICE', '练习'),
        ('EXAM', '考试'),
    ]
    # 试卷类型
    quiz_type = models.CharField(
        max_length=20,
        choices=QUIZ_TYPE_CHOICES,
        default='PRACTICE',
        verbose_name='试卷类型'
    )
    # 考试时长（分钟），仅考试类型有效
    duration = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='考试时长(分钟)'
    )
    # 及格分数，仅考试类型有效
    pass_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='及格分数'
    )
    class Meta:
        db_table = 'lms_quiz'
        verbose_name = '试卷'
        verbose_name_plural = '试卷'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['resource_uuid', 'version_number'],
                name='uniq_quiz_resource_version'
            ),
            models.UniqueConstraint(
                fields=['resource_uuid'],
                condition=Q(is_current=True),
                name='uniq_quiz_current'
            )
        ]
    def __str__(self):
        return self.title
    @property
    def total_score(self):
        """
        计算试卷总分
        Returns:
            Decimal: 试卷所有题目分值之和
        """
        from django.db.models import Sum
        result = self.quiz_questions.aggregate(
            total=Sum('question__score')
        )
        return result['total'] or 0
    @property
    def question_count(self):
        """
        获取试卷题目数量
        Returns:
            int: 试卷中的题目数量
        """
        return self.quiz_questions.count()
    @property
    def has_subjective_questions(self):
        """
        检查试卷是否包含主观题
        Returns:
            bool: 如果包含简答题则返回 True
        """
        return self.quiz_questions.filter(
            question__question_type='SHORT_ANSWER'
        ).exists()
    @property
    def objective_question_count(self):
        """
        获取客观题数量
        Returns:
            int: 客观题（单选/多选/判断）数量
        """
        return self.quiz_questions.exclude(
            question__question_type='SHORT_ANSWER'
        ).count()
    @property
    def subjective_question_count(self):
        """
        获取主观题数量
        Returns:
            int: 主观题（简答题）数量
        """
        return self.quiz_questions.filter(
            question__question_type='SHORT_ANSWER'
        ).count()
    def get_ordered_questions(self):
        """
        获取按顺序排列的题目列表
        注意：这是一个便捷查询方法，不包含业务逻辑。
        业务逻辑应在 Service 层处理。
        Returns:
            QuerySet: 按 order 排序的 QuizQuestion 查询集
        """
        return self.quiz_questions.select_related('question').order_by('order')
class QuizQuestion(TimestampMixin, models.Model):
    """
    试卷题目关联模型
    实现试卷与题目的多对多关系，支持:
    - 题目顺序
    - 同一题目可被多个试卷引用
    """
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='quiz_questions',
        verbose_name='试卷'
    )
    question = models.ForeignKey(
        'questions.Question',
        on_delete=models.PROTECT,  # 保护删除，防止删除被引用的题目
        related_name='question_quizzes',
        verbose_name='题目'
    )
    order = models.PositiveIntegerField(
        default=1,
        verbose_name='顺序'
    )
    class Meta:
        db_table = 'lms_quiz_question'
        verbose_name = '试卷题目'
        verbose_name_plural = '试卷题目'
        unique_together = ['quiz', 'question']  # 同一试卷中题目不能重复
        ordering = ['quiz', 'order']
    def __str__(self):
        return f"{self.quiz.title} - Q{self.order}: {self.question}"
    def save(self, *args, **kwargs):
        """
        保存时自动设置顺序号
        """
        if not self.order:
            # 获取当前试卷的最大顺序号
            max_order = QuizQuestion.objects.filter(
                quiz=self.quiz
            ).aggregate(
                max_order=models.Max('order')
            )['max_order']
            self.order = (max_order or 0) + 1
        super().save(*args, **kwargs)
