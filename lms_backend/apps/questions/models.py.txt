"""Question bank models for LMS."""

from django.db import models

from apps.tags.models import Tag
from core.mixins import CreatorMixin, TimestampMixin

from .question_like import (
    QUESTION_TYPE_CHOICES,
    QuestionContentMixin,
    QuestionOptionContentMixin,
)


class Question(TimestampMixin, CreatorMixin, QuestionContentMixin, models.Model):
    """题库中的当前源题。"""

    QUESTION_TYPE_CHOICES = QUESTION_TYPE_CHOICES

    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='question_updated',
        verbose_name='最后更新者',
    )
    space_tag = models.ForeignKey(
        Tag,
        on_delete=models.PROTECT,
        related_name='question_by_space',
        null=True,
        blank=True,
        verbose_name='space',
        limit_choices_to={'tag_type': 'SPACE'},
    )
    tags = models.ManyToManyField(
        Tag,
        related_name='question_items',
        blank=True,
        verbose_name='题目标签',
        limit_choices_to={'tag_type': 'TAG'},
    )
    created_from_quiz = models.ForeignKey(
        'quizzes.Quiz',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_bank_questions',
        verbose_name='首次沉淀来源试卷',
    )

    class Meta:
        db_table = 'lms_question'
        verbose_name = '题目'
        verbose_name_plural = '题目'
        ordering = ['-created_at']

    def __str__(self):
        content_preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f'[{self.get_question_type_display()}] {content_preview}'


class QuestionOption(TimestampMixin, QuestionOptionContentMixin, models.Model):
    """题库题选项。"""

    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name='question_options',
        verbose_name='题目',
    )

    class Meta:
        db_table = 'lms_question_option'
        verbose_name = '题目选项'
        verbose_name_plural = '题目选项'
        ordering = ['question_id', 'sort_order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['question', 'sort_order'],
                name='uniq_question_option_order',
            ),
        ]

    def __str__(self):
        return f'Q{self.question_id}#{self.sort_order}'
