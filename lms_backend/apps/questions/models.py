"""
Question models for LMS.
Implements:
- Question: 题目模型
"""
from django.db import models
from django.db.models import Q

from core.mixins import (
    CreatorMixin,
    SoftDeleteMixin,
    TimestampMixin,
    VersionedResourceMixin,
)
from apps.tags.models import Tag


class Question(TimestampMixin, SoftDeleteMixin, CreatorMixin, VersionedResourceMixin, models.Model):
    """
    题目模型
    题目类型:
    - SINGLE_CHOICE: 单选题
    - MULTIPLE_CHOICE: 多选题
    - TRUE_FALSE: 判断题
    - SHORT_ANSWER: 简答题
    Properties:
    - Property 13: 被引用题目删除保护
    - Property 15: 题目所有权编辑控制
    """
    QUESTION_TYPE_CHOICES = [
        ('SINGLE_CHOICE', '单选题'),
        ('MULTIPLE_CHOICE', '多选题'),
        ('TRUE_FALSE', '判断题'),
        ('SHORT_ANSWER', '简答题'),
    ]
    # 题目内容
    content = models.TextField(verbose_name='题目内容')
    # 题目类型
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPE_CHOICES,
        verbose_name='题目类型'
    )
    # 选项（用于选择题，JSON 格式存储）
    # 格式: [{"key": "A", "value": "选项内容"}, ...]
    options = models.JSONField(
        default=list,
        blank=True,
        verbose_name='选项'
    )
    # 答案
    # 单选题: "A"
    # 多选题: ["A", "B", "C"]
    # 判断题: "TRUE" 或 "FALSE"
    # 简答题: 参考答案文本
    answer = models.JSONField(verbose_name='答案')
    # 解析
    explanation = models.TextField(
        blank=True,
        default='',
        verbose_name='解析'
    )
    # 分值（默认为 1 分）
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.0,
        verbose_name='分值'
    )
    # 最后更新者
    updated_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='question_updated',
        verbose_name='最后更新者'
    )
    space_tag = models.ForeignKey(
        Tag,
        on_delete=models.PROTECT,
        related_name='question_by_space',
        null=True,
        blank=True,
        verbose_name='space',
        limit_choices_to={'tag_type': 'SPACE', 'is_active': True}
    )
    tags = models.ManyToManyField(
        Tag,
        related_name='question_items',
        blank=True,
        verbose_name='题目标签',
        limit_choices_to={'tag_type': 'TAG', 'is_active': True},
    )
    class Meta:
        db_table = 'lms_question'
        verbose_name = '题目'
        verbose_name_plural = '题目'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['resource_uuid', 'version_number'],
                name='uniq_question_resource_version'
            ),
            models.UniqueConstraint(
                fields=['resource_uuid'],
                condition=Q(is_current=True),
                name='uniq_question_current'
            )
        ]
    def __str__(self):
        # 截取题目内容前 50 个字符
        content_preview = self.content[:50] + '...' if len(self.content) > 50 else self.content
        return f"[{self.get_question_type_display()}] {content_preview}"
    @property
    def is_objective(self):
        """
        是否为客观题（可自动评分）
        客观题包括: 单选题、多选题、判断题
        主观题包括: 简答题
        """
        return self.question_type in ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
    @property
    def is_subjective(self):
        """是否为主观题（需人工评分）"""
        return self.question_type == 'SHORT_ANSWER'
    def check_answer(self, user_answer):
        """
        检查用户答案是否正确（仅适用于客观题）
        Args:
            user_answer: 用户提交的答案
        Returns:
            tuple: (is_correct: bool, obtained_score: Decimal)
        """
        from decimal import Decimal
        if self.is_subjective:
            # 主观题无法自动评分
            return None, Decimal('0')
        if self.question_type == 'SINGLE_CHOICE':
            is_correct = user_answer == self.answer
        elif self.question_type == 'MULTIPLE_CHOICE':
            # 多选题需要完全匹配
            if isinstance(user_answer, list):
                is_correct = set(user_answer) == set(self.answer)
            else:
                is_correct = False
        elif self.question_type == 'TRUE_FALSE':
            is_correct = user_answer == self.answer
        else:
            is_correct = False
        obtained_score = self.score if is_correct else Decimal('0')
        return is_correct, obtained_score
