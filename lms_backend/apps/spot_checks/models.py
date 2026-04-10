"""
SpotCheck models for LMS.
Implements:
- SpotCheck: 抽查记录模型
- SpotCheckItem: 抽查明细模型
Properties: 35, 36
"""
from decimal import Decimal, InvalidOperation
from typing import Optional

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from core.mixins import TimestampMixin


class SpotCheck(TimestampMixin, models.Model):
    """
    抽查记录模型
    用于记录一次抽查操作，具体评分拆分到多个抽查明细中。
    """

    student = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='spot_checks_received',
        verbose_name='被抽查学员',
    )
    checker = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='spot_checks_created',
        verbose_name='抽查人',
    )

    class Meta:
        db_table = 'lms_spot_check'
        verbose_name = '抽查记录'
        verbose_name_plural = '抽查记录'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.student.username} - {self.created_at.strftime('%Y-%m-%d')}"

    def _resolved_items(self):
        prefetched = getattr(self, '_prefetched_objects_cache', {})
        if 'items' in prefetched:
            return prefetched['items']
        return list(self.items.all())

    @staticmethod
    def _coerce_decimal(value) -> Optional[Decimal]:
        if value in (None, ''):
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            return None

    @property
    def topic_count(self) -> int:
        return len(self._resolved_items())

    @property
    def topic_summary(self) -> str:
        topics = []
        for item in self._resolved_items():
            topic = getattr(item, 'topic', '')
            topic = str(topic).strip()
            if topic:
                topics.append(topic)
        if not topics:
            return ''
        if len(topics) <= 3:
            return ' / '.join(topics)
        return f"{' / '.join(topics[:3])} 等 {len(topics)} 项"

    @property
    def average_score(self) -> Optional[Decimal]:
        scores = []
        for item in self._resolved_items():
            score = self._coerce_decimal(getattr(item, 'score', None))
            if score is not None:
                scores.append(score)
        if not scores:
            return None
        average = sum(scores) / Decimal(len(scores))
        return average.quantize(Decimal('0.01'))


class SpotCheckItem(models.Model):
    """抽查明细，每个主题单独评分和评语。"""

    spot_check = models.ForeignKey(
        SpotCheck,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='所属抽查记录',
    )
    topic = models.CharField(max_length=120, verbose_name='抽查主题')
    content = models.TextField(blank=True, default='', verbose_name='抽查内容')
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        verbose_name='评分',
    )
    comment = models.TextField(blank=True, default='', verbose_name='评语')
    order = models.PositiveIntegerField(default=0, verbose_name='排序')

    class Meta:
        db_table = 'lms_spot_check_item'
        verbose_name = '抽查明细'
        verbose_name_plural = '抽查明细'
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.topic} - {self.score}"
