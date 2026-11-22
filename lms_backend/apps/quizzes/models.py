"""Quiz models for LMS."""

from django.db import models
from django.db.models import Sum

from core.mixins import CreatorMixin, TimestampMixin
from apps.questions.question_like import (
    QUESTION_TYPE_CHOICES,
    QuestionContentMixin,
    QuestionOptionContentMixin,
)


class QuizDefinitionMixin(models.Model):
    """试卷公共字段与统计能力。"""

    question_type_path = 'question_type'

    title = models.CharField(max_length=200, verbose_name='试卷名称')

    class Meta:
        abstract = True

    def __str__(self):
        return self.title

    def _prefetched_quiz_questions(self):
        cache = getattr(self, '_prefetched_objects_cache', None)
        if cache is not None and 'quiz_questions' in cache:
            return cache['quiz_questions']
        return None

    @property
    def total_score(self):
        annotated = getattr(self, 'total_score_value', None)
        if annotated is not None:
            return annotated
        prefetched = self._prefetched_quiz_questions()
        if prefetched is not None:
            return sum((item.score for item in prefetched), 0)
        if not self.pk:
            return 0
        result = self.quiz_questions.aggregate(total=Sum('score'))
        return result['total'] or 0

    @property
    def question_count(self):
        annotated = getattr(self, 'question_count_value', None)
        if annotated is not None:
            return annotated
        prefetched = self._prefetched_quiz_questions()
        if prefetched is not None:
            return len(prefetched)
        if not self.pk:
            return 0
        return self.quiz_questions.count()

    @property
    def has_subjective_questions(self):
        prefetched = self._prefetched_quiz_questions()
        if prefetched is not None:
            if not prefetched:
                return False
            if self.question_type_path == 'question_type':
                return any(item.question_type == 'SHORT_ANSWER' for item in prefetched)
            if self.question_type_path == 'question__question_type' and all(
                'question' in item._state.fields_cache for item in prefetched
            ):
                return any(item.question.question_type == 'SHORT_ANSWER' for item in prefetched)
        if not self.pk:
            return False
        return self.quiz_questions.filter(**{self.question_type_path: 'SHORT_ANSWER'}).exists()


class Quiz(TimestampMixin, CreatorMixin, QuizDefinitionMixin, models.Model):
    """当前可编辑试卷。"""

    question_type_path = 'question__question_type'

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


class QuizQuestion(TimestampMixin, models.Model):
    """当前试卷只引用题库题，并保存该试卷的顺序和分值。"""

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='quiz_questions',
        verbose_name='试卷',
    )
    question = models.ForeignKey(
        'questions.Question',
        on_delete=models.PROTECT,
        related_name='quiz_uses',
        verbose_name='题库题目',
    )
    order = models.PositiveIntegerField(default=1, verbose_name='顺序')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=5, verbose_name='本试卷分值')

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


class TaskQuizQuestion(TimestampMixin, QuestionContentMixin, models.Model):
    """任务试卷上的冻结题目。"""

    QUESTION_TYPE_CHOICES = QUESTION_TYPE_CHOICES

    task_quiz = models.ForeignKey(
        'tasks.TaskQuiz',
        on_delete=models.CASCADE,
        related_name='quiz_questions',
        verbose_name='任务试卷',
    )
    order = models.PositiveIntegerField(default=1, verbose_name='顺序')
    score = models.DecimalField(max_digits=5, decimal_places=2, default=5, verbose_name='分值')

    class Meta:
        db_table = 'lms_quiz_revision_question'
        verbose_name = '任务试卷题目'
        verbose_name_plural = '任务试卷题目'
        ordering = ['task_quiz_id', 'order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['task_quiz', 'order'],
                name='uniq_quiz_revision_question_order',
            ),
        ]

    def __str__(self):
        return f'{self.task_quiz.title} - Q{self.order}'


class TaskQuizQuestionOption(TimestampMixin, QuestionOptionContentMixin, models.Model):
    """任务试卷题目的冻结选项。"""

    question = models.ForeignKey(
        TaskQuizQuestion,
        on_delete=models.CASCADE,
        related_name='question_options',
        verbose_name='任务试卷题目',
    )

    class Meta:
        db_table = 'lms_quiz_revision_question_option'
        verbose_name = '任务试卷题目选项'
        verbose_name_plural = '任务试卷题目选项'
        ordering = ['question_id', 'sort_order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'sort_order'],
                name='uniq_quiz_revision_question_option_order',
            ),
        ]

    def __str__(self):
        return f'QRQ{self.question_id}#{self.sort_order}'
