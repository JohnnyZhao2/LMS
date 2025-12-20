"""
Notification models for LMS.

Implements:
- Notification: 通知模型

Requirements: 7.5, 9.5, 11.6
"""
from django.db import models
from django.utils import timezone

from core.mixins import TimestampMixin


class Notification(TimestampMixin, models.Model):
    """
    通知模型
    
    用于记录系统通知，支持对接公司机器人发送消息。
    
    通知类型:
    - TASK_ASSIGNED: 任务分配通知
    - DEADLINE_REMINDER: 截止时间提醒
    - GRADING_COMPLETED: 评分完成通知
    - SPOT_CHECK: 抽查通知
    
    Requirements:
    - 7.5: 学习任务创建成功后通知学员
    - 9.5: 练习任务创建成功后通知学员
    - 11.6: 考试任务创建成功后通知学员
    """
    NOTIFICATION_TYPE_CHOICES = [
        ('TASK_ASSIGNED', '任务分配'),
        ('DEADLINE_REMINDER', '截止提醒'),
        ('GRADING_COMPLETED', '评分完成'),
        ('SPOT_CHECK', '抽查通知'),
    ]
    
    # 接收用户
    recipient = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='接收用户'
    )
    
    # 通知类型
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        verbose_name='通知类型'
    )
    
    # 通知标题
    title = models.CharField(
        max_length=200,
        verbose_name='通知标题'
    )
    
    # 通知内容
    content = models.TextField(
        verbose_name='通知内容'
    )
    
    # 是否已读
    is_read = models.BooleanField(
        default=False,
        verbose_name='是否已读'
    )
    
    # 已读时间
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='已读时间'
    )
    
    # 关联任务（可选，用于任务相关通知）
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='关联任务'
    )
    
    # 关联答题记录（可选，用于评分完成通知）
    submission = models.ForeignKey(
        'submissions.Submission',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='关联答题记录'
    )
    
    # 关联抽查记录（可选，用于抽查通知）
    spot_check = models.ForeignKey(
        'spot_checks.SpotCheck',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications',
        verbose_name='关联抽查记录'
    )
    
    # 是否已发送到机器人
    is_sent_to_robot = models.BooleanField(
        default=False,
        verbose_name='是否已发送到机器人'
    )
    
    # 机器人发送时间
    sent_to_robot_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='机器人发送时间'
    )
    
    class Meta:
        db_table = 'lms_notification'
        verbose_name = '通知'
        verbose_name_plural = '通知'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.recipient.username} - {self.title}"
    
    def mark_as_read(self):
        """标记为已读"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def mark_as_sent_to_robot(self):
        """标记为已发送到机器人"""
        if not self.is_sent_to_robot:
            self.is_sent_to_robot = True
            self.sent_to_robot_at = timezone.now()
            self.save(update_fields=['is_sent_to_robot', 'sent_to_robot_at'])
    
    @classmethod
    def get_unread_count(cls, user):
        """获取用户未读通知数量"""
        return cls.objects.filter(recipient=user, is_read=False).count()
