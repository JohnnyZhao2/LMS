"""Authorization models."""

from django.db import models

from apps.users.models import Role, User, UserRole
from core.mixins import TimestampMixin

from .constants import SCOPE_CHOICES


class Permission(TimestampMixin, models.Model):
    """权限目录项。"""

    code = models.CharField(max_length=100, unique=True, db_index=True, verbose_name='权限编码')
    name = models.CharField(max_length=100, verbose_name='权限名称')
    module = models.CharField(max_length=50, db_index=True, verbose_name='所属模块')
    description = models.TextField(blank=True, default='', verbose_name='权限描述')
    is_active = models.BooleanField(default=True, db_index=True, verbose_name='是否启用')
    is_configurable = models.BooleanField(default=True, db_index=True, verbose_name='是否可配置')

    class Meta:
        db_table = 'lms_permission'
        verbose_name = '权限定义'
        verbose_name_plural = '权限定义'
        ordering = ['module', 'code']

    def __str__(self):
        return self.code


class RolePermission(TimestampMixin, models.Model):
    """角色模板权限完整行（存在即授予）。"""

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions', verbose_name='角色')
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='role_permissions',
        verbose_name='权限',
    )

    class Meta:
        db_table = 'lms_role_permission'
        verbose_name = '角色权限'
        verbose_name_plural = '角色权限'
        unique_together = ['role', 'permission']
        ordering = ['role__code', 'permission__code']

    def __str__(self):
        return f'{self.role.code}:{self.permission.code}'


class RoleScope(TimestampMixin, models.Model):
    """角色模板范围。"""

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_scopes', verbose_name='角色')
    scope_group_key = models.CharField(max_length=100, db_index=True, verbose_name='范围组键')
    scope_type = models.CharField(max_length=20, choices=SCOPE_CHOICES, verbose_name='范围类型')

    class Meta:
        db_table = 'lms_role_scope'
        verbose_name = '角色范围'
        verbose_name_plural = '角色范围'
        unique_together = ['role', 'scope_group_key']
        ordering = ['role__code', 'scope_group_key']

    def __str__(self):
        return f'{self.role.code}:{self.scope_group_key}:{self.scope_type}'


class UserRolePermission(TimestampMixin, models.Model):
    """管理用户在某 UserRole 下的最终权限。"""

    user_role = models.ForeignKey(
        UserRole,
        on_delete=models.CASCADE,
        related_name='permissions',
        verbose_name='用户角色',
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='user_role_permissions',
        verbose_name='权限',
    )

    class Meta:
        db_table = 'lms_user_role_permission'
        verbose_name = '用户角色权限'
        verbose_name_plural = '用户角色权限'
        unique_together = ['user_role', 'permission']
        ordering = ['user_role_id', 'permission__code']

    def __str__(self):
        return f'{self.user_role_id}:{self.permission.code}'


class UserRoleScope(TimestampMixin, models.Model):
    """管理用户在某 UserRole 下的最终范围。"""

    user_role = models.ForeignKey(
        UserRole,
        on_delete=models.CASCADE,
        related_name='scopes',
        verbose_name='用户角色',
    )
    scope_group_key = models.CharField(max_length=100, db_index=True, verbose_name='范围组键')
    scope_type = models.CharField(max_length=20, choices=SCOPE_CHOICES, verbose_name='范围类型')

    class Meta:
        db_table = 'lms_user_role_scope'
        verbose_name = '用户角色范围'
        verbose_name_plural = '用户角色范围'
        unique_together = ['user_role', 'scope_group_key']
        ordering = ['user_role_id', 'scope_group_key']

    def __str__(self):
        return f'{self.user_role_id}:{self.scope_group_key}:{self.scope_type}'


class UserRoleScopeMember(TimestampMixin, models.Model):
    """TARGET + EXPLICIT_USERS 的指定人员。"""

    user_role_scope = models.ForeignKey(
        UserRoleScope,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name='用户角色范围',
    )
    target_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='scoped_as_member',
        verbose_name='目标用户',
    )

    class Meta:
        db_table = 'lms_user_role_scope_member'
        verbose_name = '用户角色范围成员'
        verbose_name_plural = '用户角色范围成员'
        unique_together = ['user_role_scope', 'target_user']
        ordering = ['user_role_scope_id', 'target_user_id']

    def __str__(self):
        return f'{self.user_role_scope_id}:{self.target_user_id}'
