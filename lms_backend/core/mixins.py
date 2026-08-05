"""模型字段 mixin。"""
from django.db import models
from django.utils import timezone


class TimestampMixin(models.Model):
    """created_at / updated_at。"""

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        abstract = True


class SoftDeleteMixin(models.Model):
    """软删除字段与操作。"""

    is_deleted = models.BooleanField(default=False, verbose_name='是否删除')
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name='删除时间')

    class Meta:
        abstract = True

    def soft_delete(self):
        """软删除当前对象。"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])


class CreatorMixin(models.Model):
    """创建者外键。"""

    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='%(class)s_created',
        verbose_name='创建者',
    )

    class Meta:
        abstract = True
