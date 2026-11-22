"""Authorization role profile extending Django auth.Group."""

from __future__ import annotations

from django.contrib.auth.models import Group
from django.db import models

from core.mixins import TimestampMixin


class DataScope(models.TextChoices):
    SELF = 'SELF', '仅本人数据'
    DEPT = 'DEPT', '本部门数据'
    CUSTOM_DEPT = 'CUSTOM_DEPT', '自定义部门'
    ALL = 'ALL', '全部数据'


BUILTIN_ROLE_DEFAULTS: dict[str, dict] = {
    'ADMIN': {'name': '管理员', 'data_scope': DataScope.ALL},
    'DEPT_MANAGER': {'name': '室经理', 'data_scope': DataScope.DEPT},
    'MENTOR': {'name': '导师', 'data_scope': DataScope.SELF},
}


class RoleProfile(TimestampMixin, models.Model):
    """Django Group 的轻量业务扩展：名称、数据范围、启停状态。"""

    group = models.OneToOneField(
        Group,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='关联角色组',
    )
    name = models.CharField(max_length=64, unique=True, verbose_name='角色名称')
    data_scope = models.CharField(
        max_length=20,
        choices=DataScope.choices,
        default=DataScope.SELF,
        verbose_name='数据范围',
    )
    departments = models.ManyToManyField(
        'users.Department',
        blank=True,
        related_name='scoped_role_profiles',
        verbose_name='自定义数据部门',
    )
    is_builtin = models.BooleanField(default=False, verbose_name='系统内置')
    is_active = models.BooleanField(default=True, verbose_name='启用状态')

    class Meta:
        db_table = 'lms_role_profile'
        verbose_name = '角色配置'
        verbose_name_plural = '角色配置'
        ordering = ['-is_builtin', 'group_id']

    def __str__(self) -> str:
        return f'{self.name} ({self.group.name})'
