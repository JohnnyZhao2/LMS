"""
通知视图

只处理 HTTP 请求/响应，所有业务逻辑在 Service 层。

Requirements: 7.5, 9.5, 11.6
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from core.exceptions import BusinessError
from apps.notifications.serializers import (
    NotificationSerializer,
    NotificationDetailSerializer,
    UnreadCountSerializer,
)
from apps.notifications.services import NotificationService


class NotificationViewSet(viewsets.ViewSet):
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
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = NotificationService()
    
    def get_serializer_class(self):
        """
        根据操作返回不同的序列化器
        """
        if self.action == 'retrieve':
            return NotificationDetailSerializer
        return NotificationSerializer
    
    def list(self, request):
        """
        获取当前用户的通知列表
        
        GET /api/notifications/
        """
        # 获取查询参数
        is_read = request.query_params.get('is_read')
        if is_read is not None:
            is_read = is_read.lower() == 'true'
        
        # 调用 Service
        notifications = self.service.get_list_for_user(
            user_id=request.user.id,
            is_read=is_read if is_read is not None else None,
            ordering='-created_at'
        )
        
        # 序列化输出
        serializer = self.get_serializer_class()(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def retrieve(self, request, pk=None):
        """
        获取通知详情
        
        GET /api/notifications/{id}/
        """
        try:
            notification = self.service.get_by_id(pk, request.user.id)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND if e.code == 'RESOURCE_NOT_FOUND' 
                else status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer_class()(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        """
        标记单条通知为已读
        
        POST /api/notifications/{id}/read/
        """
        try:
            notification = self.service.mark_as_read(pk, request.user.id)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND if e.code == 'RESOURCE_NOT_FOUND' 
                else status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer_class()(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        """
        标记所有通知为已读
        
        POST /api/notifications/read-all/
        """
        count = self.service.mark_all_as_read(request.user.id)
        return Response({
            'message': f'已标记 {count} 条通知为已读',
            'count': count
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """
        获取未读通知数量
        
        GET /api/notifications/unread-count/
        """
        count = self.service.get_unread_count(request.user.id)
        serializer = UnreadCountSerializer({'unread_count': count})
        return Response(serializer.data, status=status.HTTP_200_OK)
