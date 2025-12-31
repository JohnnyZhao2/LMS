"""
Quiz models for LMS.

Implements:
- Quiz: 试卷模型
- QuizQuestion: 试卷题目关联模型

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
"""
import uuid

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone

from core.mixins import TimestampMixin, SoftDeleteMixin, CreatorMixin


class Quiz(TimestampMixin, SoftDeleteMixin, CreatorMixin, models.Model):
    """
    试卷模型
    
    试卷是题目的容器，不包含考试规则（考试规则在任务中设置）。
    
    Requirements:
    - 6.1: 创建试卷时存储试卷名称、描述，并记录创建者
    - 6.4: 导师或室经理可查看所有试卷（包含管理员创建的标准试卷）
    - 6.5: 导师或室经理仅允许编辑自己创建的试卷
    - 6.6: 导师或室经理仅允许删除自己创建的试卷
    - 6.7: 管理员允许查看/创建/编辑/删除所有试卷
    - 6.8: 试卷被任务引用时禁止删除
    
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
    
    STATUS_CHOICES = [
        ('DRAFT', '草稿'),
        ('PUBLISHED', '已发布'),
    ]
    
    # 题目（通过 QuizQuestion 中间表关联）
    questions = models.ManyToManyField(
        'questions.Question',
        through='QuizQuestion',
        through_fields=('quiz', 'question'),
        related_name='quizzes',
        verbose_name='题目'
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PUBLISHED',
        verbose_name='发布状态'
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
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='发布时间'
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
    
    def is_referenced_by_task(self):
        """
        检查试卷是否被任务引用
        
        Requirements: 6.8
        Property 14: 被引用试卷删除保护
        
        Returns:
            bool: 如果被任务引用则返回 True
        """
        # 延迟导入避免循环依赖
        # TaskQuiz 模型将在 tasks app 中定义
        try:
            from apps.tasks.models import TaskQuiz
            return TaskQuiz.objects.filter(quiz=self).exists()
        except ImportError:
            # tasks app 尚未实现
            return False
    
    def delete(self, *args, **kwargs):
        """
        重写删除方法，实现删除保护
        
        Requirements: 6.8
        Property 14: 被引用试卷删除保护
        """
        if self.is_referenced_by_task():
            raise ValidationError('该试卷已被任务引用，无法删除')
        super().delete(*args, **kwargs)
    
    @classmethod
    def next_version_number(cls, resource_uuid):
        if not resource_uuid:
            return 1
        aggregate = cls.objects.filter(
            resource_uuid=resource_uuid,
            is_deleted=False
        ).aggregate(
            max_version=models.Max('version_number')
        )
        max_version = aggregate['max_version'] or 0
        return max_version + 1
    
    def clone_new_version(self):
        """
        创建当前试卷的新版本，复制现有题目顺序。
        """
        new_quiz = Quiz.objects.create(
            title=self.title,
            description=self.description,
            created_by=self.created_by,
            status='PUBLISHED',
            resource_uuid=self.resource_uuid,
            version_number=self.next_version_number(self.resource_uuid),
            source_version=self,
            published_at=timezone.now(),
            is_current=True,
            quiz_type=self.quiz_type,
            duration=self.duration,
            pass_score=self.pass_score,
        )
        for relation in self.get_ordered_questions():
            QuizQuestion.objects.create(
                quiz=new_quiz,
                question=relation.question,
                order=relation.order
            )
        Quiz.objects.filter(
            resource_uuid=self.resource_uuid,
            status='PUBLISHED'
        ).exclude(pk=new_quiz.pk).update(is_current=False)
        return new_quiz
    
    def add_question(self, question, order=None):
        """
        向试卷添加题目
        
        Requirements: 6.2
        
        Args:
            question: Question 实例
            order: 题目顺序，如果为 None 则自动追加到末尾
            
        Returns:
            QuizQuestion: 创建的关联记录
        """
        if order is None:
            # 获取当前最大顺序号
            max_order = self.quiz_questions.aggregate(
                max_order=models.Max('order')
            )['max_order']
            order = (max_order or 0) + 1
        
        return QuizQuestion.objects.create(
            quiz=self,
            question=question,
            order=order
        )
    
    def remove_question(self, question):
        """
        从试卷移除题目
        
        Args:
            question: Question 实例
            
        Returns:
            bool: 是否成功移除
        """
        deleted_count, _ = QuizQuestion.objects.filter(
            quiz=self,
            question=question
        ).delete()
        return deleted_count > 0
    
    def reorder_questions(self, question_ids):
        """
        重新排序试卷中的题目
        
        Args:
            question_ids: 按新顺序排列的题目 ID 列表
        """
        for index, question_id in enumerate(question_ids, start=1):
            QuizQuestion.objects.filter(
                quiz=self,
                question_id=question_id
            ).update(order=index)
    
    def get_ordered_questions(self):
        """
        获取按顺序排列的题目列表
        
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
    
    Requirements:
    - 6.2: 向试卷添加题目时允许从全平台题库选择已有题目
    - 6.3: 在创建试卷时新建的题目纳入题库
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
