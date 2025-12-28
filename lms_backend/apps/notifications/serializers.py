"""
Notification serializers for LMS.

Requirements: 7.5, 9.5, 11.6
"""
from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    通知序列化器
    
    用于通知列表和详情展示。
    """
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )
    task_id = serializers.IntegerField(source='task.id', read_only=True, allow_null=True)
    task_title = serializers.CharField(source='task.title', read_only=True, allow_null=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'title',
            'content',
            'is_read',
            'read_at',
            'task_id',
            'task_title',
            'created_at',
        ]
        read_only_fields = fields


class NotificationDetailSerializer(NotificationSerializer):
    """
    通知详情序列化器
    
    包含更多关联信息。
    """
    submission_id = serializers.IntegerField(
        source='submission.id',
        read_only=True,
        allow_null=True
    )
    spot_check_id = serializers.IntegerField(
        source='spot_check.id',
        read_only=True,
        allow_null=True
    )
    
    class Meta(NotificationSerializer.Meta):
        fields = NotificationSerializer.Meta.fields + [
            'submission_id',
            'spot_check_id',
        ]


class UnreadCountSerializer(serializers.Serializer):
    """
    未读数量序列化器
    """
    unread_count = serializers.IntegerField()
