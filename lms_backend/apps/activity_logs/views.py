"""
Activity logs views.
提供用户日志、内容日志、操作日志的查询接口。
"""
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from core.base_view import BaseAPIView
from core.pagination import StandardResultsSetPagination
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from .models import UserLog, ContentLog, OperationLog
from .serializers import UserLogSerializer, ContentLogSerializer, OperationLogSerializer


class UserLogListView(BaseAPIView):
    """
    用户日志列表
    记录用户登录、登出、密码修改等操作
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        summary='获取用户日志列表',
        description='获取用户日志列表，支持分页',
        parameters=[
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: UserLogSerializer(many=True)},
        tags=['活动日志']
    )
    def get(self, request):
        """获取用户日志列表"""
        queryset = UserLog.objects.select_related('user', 'operator').all()

        # 使用 DRF 分页器处理分页
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = UserLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # 如果不分页，直接返回
        serializer = UserLogSerializer(queryset, many=True)
        return self.success_response(serializer.data)


class ContentLogListView(BaseAPIView):
    """
    内容日志列表
    记录知识文档、试卷、题目等内容的创建、修改、删除
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        summary='获取内容日志列表',
        description='获取内容日志列表，支持分页',
        parameters=[
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: ContentLogSerializer(many=True)},
        tags=['活动日志']
    )
    def get(self, request):
        """获取内容日志列表"""
        queryset = ContentLog.objects.select_related('operator').all()

        # 使用 DRF 分页器处理分页
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = ContentLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # 如果不分页，直接返回
        serializer = ContentLogSerializer(queryset, many=True)
        return self.success_response(serializer.data)


class OperationLogListView(BaseAPIView):
    """
    操作日志列表
    记录任务管理、评分、抽查、数据导出等操作
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        summary='获取操作日志列表',
        description='获取操作日志列表，支持分页',
        parameters=[
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: OperationLogSerializer(many=True)},
        tags=['活动日志']
    )
    def get(self, request):
        """获取操作日志列表"""
        queryset = OperationLog.objects.select_related('operator').all()

        # 使用 DRF 分页器处理分页
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = OperationLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # 如果不分页，直接返回
        serializer = OperationLogSerializer(queryset, many=True)
        return self.success_response(serializer.data)
