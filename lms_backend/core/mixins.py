"""
Common mixins for LMS views and models.
Properties: 37, 38, 39
"""
from django.db import models


class TimestampMixin(models.Model):
    """
    Mixin that adds created_at and updated_at fields.
    """
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    class Meta:
        abstract = True


class CreatorMixin(models.Model):
    """
    Mixin that tracks the creator of an object.
    """
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='%(class)s_created',
        verbose_name='创建者'
    )
    class Meta:
        abstract = True
