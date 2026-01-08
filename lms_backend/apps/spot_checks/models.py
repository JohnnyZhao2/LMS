"""
SpotCheck models for LMS.
Implements:
- SpotCheck: 抽查记录模型
Properties: 35, 36
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from core.mixins import TimestampMixin
class SpotCheck(TimestampMixin, models.Model):
    """
    抽查记录模型
    用于记录线下抽查的评分结果，作为学员能力评估的补充数据。
    Fields:
    - student: 被抽查学员
    - checker: 抽查人（导师/室经理）
    - content: 抽查内容
    - score: 评分（0-100）
    - comment: 评语
    - checked_at: 抽查时间
    Properties:
    - Property 35: 抽查学员范围限制
    - Property 36: 抽查记录时间排序
    """
    student = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='spot_checks_received',
        verbose_name='被抽查学员'
    )
    checker = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='spot_checks_created',
        verbose_name='抽查人'
    )
    content = models.TextField(
        verbose_name='抽查内容'
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100)
        ],
        verbose_name='评分'
    )
    comment = models.TextField(
        blank=True,
        default='',
        verbose_name='评语'
    )
    checked_at = models.DateTimeField(
        verbose_name='抽查时间'
    )
    class Meta:
        db_table = 'lms_spot_check'
        verbose_name = '抽查记录'
        verbose_name_plural = '抽查记录'
        # Property 36: 抽查记录时间排序（按 checked_at 降序）
        ordering = ['-checked_at']
    def __str__(self):
        return f"{self.student.username} - {self.checked_at.strftime('%Y-%m-%d')}"
