"""Quiz models for LMS."""

from django.db import models
from django.db.models import Count, Sum

from core.mixins import CreatorMixin, TimestampMixin
from apps.questions.question_like import (
    QUESTION_TYPE_CHOICES,
    QuestionContentMixin,
    QuestionOptionContentMixin,
)


QUIZ_TYPE_CHOICES = [
    ('PRACTICE', '测验'),
    ('EXAM', '考试'),
]


class QuizDefinitionMixin(models.Model):
    """试卷公共字段与统计能力。"""

    title = models.CharField(max_length=200, verbose_name='试卷名称')
    quiz_type = models.CharField(
        max_length=20,
        choices=QUIZ_TYPE_CHOICES,
        default='PRACTICE',
        verbose_name='试卷类型',
    )
    duration = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='考试时长(分钟)',
    )
    pass_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name='及格分数',
    )

    class Meta:
        abstract = True

    def __str__(self):
        return self.title

    @property
    def total_score(self):
        if not self.pk:
            return 0
        result = self.quiz_questions.aggregate(total=Sum('score'))
        return result['total'] or 0

    @property
    def question_count(self):
        if not self.pk:
            return 0
        return self.quiz_questions.count()

    @property
    def has_subjective_questions(self):
        if not self.pk:
            return False
        return self.quiz_questions.filter(question_type='SHORT_ANSWER').exists()

    @property
    def objective_question_count(self):
        if not self.pk:
            return 0
        return self.quiz_questions.exclude(question_type='SHORT_ANSWER').count()

    @property
    def subjective_question_count(self):
        if not self.pk:
            return 0
        return self.quiz_questions.filter(question_type='SHORT_ANSWER').count()

    @property
    def question_type_counts(self):
        if not self.pk:
            return {}
        counts = self.quiz_questions.values('question_type').annotate(count=Count('id'))
        return {item['question_type']: item['count'] for item in counts}


class Quiz(TimestampMixin, CreatorMixin, QuizDefinitionMixin, models.Model):
    """当前可编辑试卷。"""

    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_updated',
        verbose_name='最后更新者',
    )

    class Meta:
        db_table = 'lms_quiz'
        verbose_name = '试卷'
        verbose_name_plural = '试卷'
        ordering = ['-created_at']


class QuizQuestion(TimestampMixin, QuestionContentMixin, models.Model):
    """当前试卷中的题目副本。"""

    QUESTION_TYPE_CHOICES = QUESTION_TYPE_CHOICES

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='quiz_questions',
        verbose_name='试卷',
    )
    question = models.ForeignKey(
        'questions.Question',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_copies',
        verbose_name='来源题库题',
    )
    order = models.PositiveIntegerField(default=1, verbose_name='顺序')
    space_tag_name = models.CharField(max_length=100, blank=True, default='', verbose_name='space 名称')
    tags_json = models.JSONField(verbose_name='标签快照', default=list, blank=True)

    class Meta:
        db_table = 'lms_quiz_question'
        verbose_name = '试卷题目'
        verbose_name_plural = '试卷题目'
        ordering = ['quiz_id', 'order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['quiz', 'order'],
                name='uniq_quiz_question_order',
            ),
        ]

    def __str__(self):
        return f'{self.quiz.title} - Q{self.order}'


class QuizQuestionOption(TimestampMixin, QuestionOptionContentMixin, models.Model):
    """当前试卷题目副本的选项。"""

    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name='question_options',
        verbose_name='试卷题目',
    )

    class Meta:
        db_table = 'lms_quiz_question_option'
        verbose_name = '试卷题目选项'
        verbose_name_plural = '试卷题目选项'
        ordering = ['question_id', 'sort_order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'sort_order'],
                name='uniq_quiz_question_option_order',
            ),
        ]

    def __str__(self):
        return f'QQ{self.question_id}#{self.sort_order}'


class QuizRevision(TimestampMixin, CreatorMixin, QuizDefinitionMixin, models.Model):
    """任务执行链路使用的试卷快照。"""

    source_quiz = models.ForeignKey(
        Quiz,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revisions',
        verbose_name='来源试卷',
    )
    revision_number = models.PositiveIntegerField(default=1, verbose_name='快照版本号')
    structure_hash = models.CharField(max_length=64, db_index=True, verbose_name='结构哈希')

    class Meta:
        db_table = 'lms_quiz_revision'
        verbose_name = '试卷快照'
        verbose_name_plural = '试卷快照'
        ordering = ['-created_at', '-revision_number']
        constraints = [
            models.UniqueConstraint(
                fields=['source_quiz', 'revision_number'],
                name='uniq_quiz_revision_number',
            ),
        ]

    def __str__(self):
        return f'{self.title} v{self.revision_number}'


class QuizRevisionQuestion(TimestampMixin, QuestionContentMixin, models.Model):
    """执行态题目快照。"""

    QUESTION_TYPE_CHOICES = QUESTION_TYPE_CHOICES

    quiz = models.ForeignKey(
        QuizRevision,
        on_delete=models.CASCADE,
        related_name='quiz_questions',
        verbose_name='试卷快照',
    )
    question = models.ForeignKey(
        'questions.Question',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='quiz_revision_entries',
        verbose_name='来源题库题',
    )
    order = models.PositiveIntegerField(default=1, verbose_name='顺序')
    space_tag_name = models.CharField(max_length=100, blank=True, default='', verbose_name='space 名称')
    tags_json = models.JSONField(verbose_name='标签快照', default=list, blank=True)

    class Meta:
        db_table = 'lms_quiz_revision_question'
        verbose_name = '试卷快照题目'
        verbose_name_plural = '试卷快照题目'
        ordering = ['quiz_id', 'order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['quiz', 'order'],
                name='uniq_quiz_revision_question_order',
            ),
        ]

    def __str__(self):
        return f'{self.quiz.title} v{self.quiz.revision_number} - Q{self.order}'


class QuizRevisionQuestionOption(TimestampMixin, QuestionOptionContentMixin, models.Model):
    """执行态题目快照选项。"""

    question = models.ForeignKey(
        QuizRevisionQuestion,
        on_delete=models.CASCADE,
        related_name='question_options',
        verbose_name='试卷快照题目',
    )

    class Meta:
        db_table = 'lms_quiz_revision_question_option'
        verbose_name = '试卷快照题目选项'
        verbose_name_plural = '试卷快照题目选项'
        ordering = ['question_id', 'sort_order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'sort_order'],
                name='uniq_quiz_revision_question_option_order',
            ),
        ]

    def __str__(self):
        return f'QRQ{self.question_id}#{self.sort_order}'
