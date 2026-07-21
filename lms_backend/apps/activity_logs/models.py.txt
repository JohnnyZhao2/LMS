from django.conf import settings
from django.db import models


class ActivityLogPolicy(models.Model):
    """活动日志策略 - 用于控制动作级别的记录开关（白名单）"""

    CATEGORY_CHOICES = [
        ('user', '用户日志'),
        ('content', '内容日志'),
        ('operation', '操作日志'),
    ]

    key = models.CharField(max_length=120, unique=True, verbose_name='动作标识')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='日志类型')
    group = models.CharField(max_length=50, verbose_name='分组')
    label = models.CharField(max_length=100, verbose_name='动作名称')
    enabled = models.BooleanField(default=True, verbose_name='是否记录')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'activity_log_policies'
        verbose_name = '活动日志策略'
        verbose_name_plural = '活动日志策略'
        ordering = ['category', 'group', 'label']
        indexes = [
            models.Index(fields=['category', 'group'], name='activity_log_policy_cg_idx'),
            models.Index(fields=['key'], name='activity_log_policy_key_idx'),
        ]

    def __str__(self):
        return f'{self.key} ({self.label})'


class ActivityLog(models.Model):
    CATEGORY_CHOICES = ActivityLogPolicy.CATEGORY_CHOICES
    STATUS_CHOICES = [
        ('success', '成功'),
        ('failed', '失败'),
        ('partial', '部分成功'),
    ]

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, verbose_name='日志类型')
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_logs',
        verbose_name='行为主体',
    )
    action = models.CharField(max_length=100, verbose_name='操作')
    summary = models.CharField(max_length=255, verbose_name='摘要')
    description = models.TextField(blank=True, default='', verbose_name='详情')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success', verbose_name='状态')
    target_type = models.CharField(max_length=50, blank=True, default='', verbose_name='目标类型')
    target_id = models.CharField(max_length=100, blank=True, default='', verbose_name='目标ID')
    target_title = models.CharField(max_length=255, blank=True, default='', verbose_name='目标标题')
    duration = models.IntegerField(default=0, verbose_name='耗时(毫秒)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'activity_logs'
        verbose_name = '活动日志'
        verbose_name_plural = '活动日志'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['category', '-created_at'], name='actlog_cat_created_idx'),
            models.Index(fields=['actor', '-created_at'], name='actlog_actor_created_idx'),
            models.Index(fields=['action', '-created_at'], name='actlog_action_created_idx'),
        ]

    def __str__(self):
        actor_name = self.actor.username if self.actor else '系统'
        return f'{actor_name} - {self.summary}'
