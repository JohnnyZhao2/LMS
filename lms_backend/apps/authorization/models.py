"""Authorization models."""

from django.db import models

from apps.users.models import User
from core.mixins import TimestampMixin


class Permission(TimestampMixin, models.Model):
    """Permission catalog item."""

    code = models.CharField(max_length=100, unique=True, db_index=True, verbose_name='权限编码')
    name = models.CharField(max_length=100, verbose_name='权限名称')
    module = models.CharField(max_length=50, db_index=True, verbose_name='所属模块')
    description = models.TextField(blank=True, default='', verbose_name='权限描述')
    is_active = models.BooleanField(default=True, db_index=True, verbose_name='是否启用')

    class Meta:
        db_table = 'lms_permission'
        verbose_name = '权限定义'
        verbose_name_plural = '权限定义'
        ordering = ['module', 'code']

    def __str__(self):
        return self.code


class UserPermission(TimestampMixin, models.Model):
    """用户直接拥有的管理权限。"""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='authorization_permissions',
        verbose_name='用户',
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='assigned_users',
        verbose_name='权限',
    )

    class Meta:
        db_table = 'lms_user_permission'
        verbose_name = '用户权限'
        verbose_name_plural = '用户权限'
        ordering = ['user_id', 'permission__code']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'permission'],
                name='uniq_user_permission',
            ),
        ]

    def __str__(self):
        return f'{self.user_id}:{self.permission.code}'
