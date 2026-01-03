"""
通知仓储实现

负责所有通知相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet

from core.base_repository import BaseRepository
from .models import Notification


class NotificationRepository(BaseRepository[Notification]):
    """通知仓储"""
    
    model = Notification
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Notification]:
        """
        根据 ID 获取通知
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            通知对象或 None
        """
        qs = self.model.objects.select_related(
            'recipient',
            'task',
            'submission',
            'spot_check'
        )
        
        if not include_deleted:
            qs = qs.filter(**self._get_active_filters())
        
        return qs.filter(pk=pk).first()
    
    def get_for_user(
        self,
        user_id: int,
        filters: dict = None,
        ordering: str = '-created_at'
    ) -> QuerySet[Notification]:
        """
        获取用户的通知列表
        
        Args:
            user_id: 用户 ID
            filters: 过滤条件（如 is_read）
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            recipient_id=user_id
        ).select_related(
            'task',
            'submission',
            'spot_check'
        )
        
        if filters:
            qs = qs.filter(**filters)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def get_unread_for_user(self, user_id: int) -> QuerySet[Notification]:
        """
        获取用户的未读通知列表
        
        Args:
            user_id: 用户 ID
            
        Returns:
            QuerySet
        """
        return self.get_for_user(
            user_id=user_id,
            filters={'is_read': False},
            ordering='-created_at'
        )
    
    def get_unread_count(self, user_id: int) -> int:
        """
        获取用户未读通知数量
        
        Args:
            user_id: 用户 ID
            
        Returns:
            未读通知数量
        """
        return self.model.objects.filter(
            recipient_id=user_id,
            is_read=False
        ).count()
    
    def mark_as_read(self, notification: Notification, read_at=None) -> Notification:
        """
        标记通知为已读
        
        Args:
            notification: 通知对象
            read_at: 已读时间（可选，默认当前时间）
            
        Returns:
            更新后的通知对象
        """
        from django.utils import timezone
        if read_at is None:
            read_at = timezone.now()
        
        return self.update(
            notification,
            is_read=True,
            read_at=read_at
        )
    
    def mark_all_as_read(
        self,
        user_id: int,
        read_at=None
    ) -> int:
        """
        标记用户所有未读通知为已读
        
        Args:
            user_id: 用户 ID
            read_at: 已读时间（可选，默认当前时间）
            
        Returns:
            更新的通知数量
        """
        from django.utils import timezone
        if read_at is None:
            read_at = timezone.now()
        
        return self.model.objects.filter(
            recipient_id=user_id,
            is_read=False
        ).update(
            is_read=True,
            read_at=read_at
        )
    
    def mark_as_sent_to_robot(
        self,
        notification: Notification,
        sent_at=None
    ) -> Notification:
        """
        标记通知已发送到机器人
        
        Args:
            notification: 通知对象
            sent_at: 发送时间（可选，默认当前时间）
            
        Returns:
            更新后的通知对象
        """
        from django.utils import timezone
        if sent_at is None:
            sent_at = timezone.now()
        
        return self.update(
            notification,
            is_sent_to_robot=True,
            sent_to_robot_at=sent_at
        )
    
    def batch_create(
        self,
        notifications_data: List[dict]
    ) -> List[Notification]:
        """
        批量创建通知
        
        Args:
            notifications_data: 通知数据列表
            
        Returns:
            创建的通知对象列表
        """
        notifications = []
        for data in notifications_data:
            notification = self.create(**data)
            notifications.append(notification)
        return notifications
    
    def _get_active_filters(self) -> dict:
        """获取活动记录的过滤条件（如果有软删除）"""
        # Notification 模型当前没有软删除字段，返回空字典
        return {}