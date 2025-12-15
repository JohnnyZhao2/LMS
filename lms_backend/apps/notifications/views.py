"""
Notification views for LMS.

Implements notification API endpoints.

Requirements: 7.5, 9.5, 11.6
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.notifications.models import Notification
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationDetailSerializer,
    UnreadCountSerializer,
)
from apps.notifications.services import NotificationService


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    通知视图集
    
    提供通知列表、详情、标记已读等功能。
    
    Endpoints:
    - GET /api/notifications/ - 通知列表
    - GET /api/notifications/{id}/ - 通知详情
    - POST /api/notifications/{id}/read/ - 标记单条已读
    - POST /api/notifications/read-all/ - 全部标记已读
    - GET /api/notifications/unread-count/ - 未读数量
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    
    def get_queryset(self):
        """
        获取当前用户的通知列表
        """
        return Notification.objects.filter(
            recipient=self.request.user
        ).select_related('task', 'submission', 'spot_check')
    
    def get_serializer_class(self):
        """
        根据操作返回不同的序列化器
        """
        if self.action == 'retrieve':
            return NotificationDetailSerializer
        return NotificationSerializer
    
    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """
        标记单条通知为已读
        
        POST /api/notifications/{id}/read/
        """
        notification = self.get_object()
        notification.mark_as_read()
        
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        """
        标记所有通知为已读
        
        POST /api/notifications/read-all/
        """
        count = NotificationService.mark_all_as_read(request.user)
        return Response({
            'message': f'已标记 {count} 条通知为已读',
            'count': count
        })
    
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """
        获取未读通知数量
        
        GET /api/notifications/unread-count/
        """
        count = NotificationService.get_unread_count(request.user)
        serializer = UnreadCountSerializer({'unread_count': count})
        return Response(serializer.data)
