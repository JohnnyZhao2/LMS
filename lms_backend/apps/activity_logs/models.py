from django.db import models
from django.conf import settings


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


class UserLog(models.Model):
    """用户日志 - 记录用户登录、登出、密码修改等操作"""

    ACTION_CHOICES = [
        ('login', '登录系统'),
        ('logout', '登出系统'),
        ('password_change', '修改密码'),
        ('login_failed', '登录失败'),
        ('role_assigned', '角色分配'),
        ('mentor_assigned', '分配导师'),
        ('activate', '启用账号'),
        ('deactivate', '停用账号'),
        ('switch_role', '切换角色'),
    ]

    STATUS_CHOICES = [
        ('success', '成功'),
        ('failed', '失败'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_logs',
        verbose_name='用户'
    )
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='operated_user_logs',
        verbose_name='操作者'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, verbose_name='操作')
    description = models.TextField(verbose_name='详情')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'user_logs'
        verbose_name = '用户日志'
        verbose_name_plural = '用户日志'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.get_action_display()} - {self.created_at}'


class ContentLog(models.Model):
    """内容日志 - 记录知识文档、试卷、题目等内容的创建、修改、删除"""

    CONTENT_TYPE_CHOICES = [
        ('knowledge', '知识文档'),
        ('quiz', '试卷'),
        ('question', '题目'),
        ('assignment', '作业'),
    ]

    ACTION_CHOICES = [
        ('create', '创建'),
        ('update', '修改'),
        ('delete', '删除'),
        ('publish', '发布'),
    ]

    STATUS_CHOICES = [
        ('success', '成功'),
        ('failed', '失败'),
    ]

    content_type = models.CharField(max_length=50, choices=CONTENT_TYPE_CHOICES, verbose_name='内容类型')
    content_id = models.CharField(max_length=100, verbose_name='内容ID')
    content_title = models.CharField(max_length=255, verbose_name='内容标题')
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='content_logs',
        verbose_name='操作者'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, verbose_name='操作')
    description = models.TextField(verbose_name='详情')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success', verbose_name='状态')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'content_logs'
        verbose_name = '内容日志'
        verbose_name_plural = '内容日志'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['content_type', '-created_at']),
            models.Index(fields=['operator', '-created_at']),
        ]

    def __str__(self):
        return f'{self.operator.username} - {self.get_action_display()} - {self.content_title}'


class OperationLog(models.Model):
    """操作日志 - 记录任务管理、评分、抽查、数据导出等操作"""

    OPERATION_TYPE_CHOICES = [
        ('task_management', '任务管理'),
        ('grading', '评分操作'),
        ('spot_check', '抽查记录'),
        ('data_export', '数据导出'),
        ('submission', '答题/考试'),
        ('learning', '学习进度'),
    ]

    STATUS_CHOICES = [
        ('success', '成功'),
        ('failed', '失败'),
        ('partial', '部分成功'),
    ]

    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='operation_logs',
        verbose_name='操作者'
    )
    operation_type = models.CharField(max_length=50, choices=OPERATION_TYPE_CHOICES, verbose_name='操作类型')
    action = models.CharField(max_length=100, verbose_name='操作')
    description = models.TextField(verbose_name='操作描述')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='success', verbose_name='状态')
    duration = models.IntegerField(default=0, verbose_name='耗时(毫秒)')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'operation_logs'
        verbose_name = '操作日志'
        verbose_name_plural = '操作日志'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['operation_type', '-created_at']),
            models.Index(fields=['operator', '-created_at']),
        ]

    def __str__(self):
        return f'{self.operator.username} - {self.action} - {self.created_at}'
