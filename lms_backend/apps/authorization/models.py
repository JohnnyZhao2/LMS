"""Authorization models."""

from django.db import models

from apps.users.models import Role, User
from core.mixins import TimestampMixin

from .constants import EFFECT_ALLOW, EFFECT_CHOICES, SCOPE_ALL, SCOPE_CHOICES


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


class RolePermission(TimestampMixin, models.Model):
    """Role permission overrides relative to code defaults."""

    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions', verbose_name='角色')
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='role_permissions',
        verbose_name='权限',
    )
    effect = models.CharField(
        max_length=10,
        choices=EFFECT_CHOICES,
        default=EFFECT_ALLOW,
        db_index=True,
        verbose_name='覆盖效果',
    )

    class Meta:
        db_table = 'lms_role_permission'
        verbose_name = '角色权限覆盖'
        verbose_name_plural = '角色权限覆盖'
        unique_together = ['role', 'permission']
        ordering = ['role__code', 'effect', 'permission__code']

    def __str__(self):
        return f'{self.role.code}:{self.effect}:{self.permission.code}'


class UserPermissionOverride(TimestampMixin, models.Model):
    """Current user-level allow/deny permission override."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='permission_overrides',
        verbose_name='目标用户',
    )
    permission = models.ForeignKey(
        Permission,
        on_delete=models.CASCADE,
        related_name='user_overrides',
        verbose_name='权限',
    )
    effect = models.CharField(max_length=10, choices=EFFECT_CHOICES, db_index=True, verbose_name='覆盖效果')
    applies_to_role = models.CharField(
        max_length=20,
        choices=Role.ROLE_CHOICES,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='生效角色',
    )
    reason = models.CharField(max_length=255, default='', blank=True, verbose_name='原因')
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name='过期时间')

    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='granted_permission_overrides',
        verbose_name='授权人',
    )

    class Meta:
        db_table = 'lms_user_permission_override'
        verbose_name = '用户权限覆盖'
        verbose_name_plural = '用户权限覆盖'
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['user', 'permission'], name='user_perm_override_u_p_idx'),
            models.Index(fields=['user', 'applies_to_role'], name='user_perm_override_u_r_idx'),
        ]

    def __str__(self):
        role = self.applies_to_role or 'ALL_ROLES'
        return f'{self.user_id}:{role}:{self.effect}:{self.permission.code}'


class UserScopeGroupOverride(TimestampMixin, models.Model):
    """Current user-level scope group allow/deny override."""

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='scope_group_overrides',
        verbose_name='目标用户',
    )
    scope_group_key = models.CharField(max_length=100, db_index=True, verbose_name='范围组键')
    effect = models.CharField(max_length=10, choices=EFFECT_CHOICES, db_index=True, verbose_name='覆盖效果')
    applies_to_role = models.CharField(
        max_length=20,
        choices=Role.ROLE_CHOICES,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='生效角色',
    )
    scope_type = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default=SCOPE_ALL,
        verbose_name='作用域类型',
    )
    scope_user_ids = models.JSONField(default=list, blank=True, verbose_name='指定用户ID列表')
    reason = models.CharField(max_length=255, default='', blank=True, verbose_name='原因')
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True, verbose_name='过期时间')
    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='granted_scope_group_overrides',
        verbose_name='授权人',
    )

    class Meta:
        db_table = 'lms_user_scope_group_override'
        verbose_name = '用户范围组覆盖'
        verbose_name_plural = '用户范围组覆盖'
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['user', 'scope_group_key'], name='user_scope_group_u_g_idx'),
            models.Index(fields=['user', 'applies_to_role'], name='user_scope_group_u_r_idx'),
        ]

    def __str__(self):
        role = self.applies_to_role or 'ALL_ROLES'
        return f'{self.user_id}:{role}:{self.effect}:{self.scope_group_key}:{self.scope_type}'
