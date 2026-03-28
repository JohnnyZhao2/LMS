from django.db import models
from django.core.exceptions import ValidationError

from core.mixins import TimestampMixin


class Tag(TimestampMixin, models.Model):
    TAG_TYPE_CHOICES = [
        ('LINE', '条线类型'),
        ('TAG', '知识标签'),
    ]

    name = models.CharField(max_length=100, verbose_name='标签名称')
    color = models.CharField(max_length=7, default='#4A90E2', verbose_name='主题色')
    tag_type = models.CharField(
        max_length=20,
        choices=TAG_TYPE_CHOICES,
        verbose_name='标签类型',
    )
    sort_order = models.IntegerField(default=0, verbose_name='排序序号')
    is_active = models.BooleanField(default=True, verbose_name='是否启用')
    allow_knowledge = models.BooleanField(default=True, verbose_name='适用于知识')
    allow_question = models.BooleanField(default=False, verbose_name='适用于题目')

    class Meta:
        db_table = 'lms_tag'
        verbose_name = '标签'
        verbose_name_plural = '标签'
        ordering = ['tag_type', 'sort_order', 'name']
        unique_together = [['name', 'tag_type']]

    def clean(self):
        super().clean()
        if self.tag_type == 'LINE':
            self.allow_knowledge = True
            self.allow_question = True
            return
        if not self.allow_knowledge and not self.allow_question:
            raise ValidationError('普通标签至少需要适用于知识或题目之一')

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.get_tag_type_display()})'

