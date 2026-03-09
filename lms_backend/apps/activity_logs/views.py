"""
Activity logs views.
提供用户日志、内容日志、操作日志的查询接口。
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.services import AuthorizationService
from core.base_view import BaseAPIView
from core.pagination import StandardResultsSetPagination
from core.responses import success_response

from .models import ActivityLogPolicy, ContentLog, OperationLog, UserLog
from .serializers import (
    ActivityLogPolicySerializer,
    ActivityLogPolicyUpdateSerializer,
    ContentLogSerializer,
    OperationLogSerializer,
    UserLogSerializer,
)
from .services import ActivityLogService


def enforce_activity_log_view_permission(request, error_message: str) -> None:
    AuthorizationService(request).enforce('activity_log.view', error_message=error_message)


def enforce_activity_log_policy_update_permission(request, error_message: str) -> None:
    AuthorizationService(request).enforce('activity_log.policy.update', error_message=error_message)


class UserLogListView(BaseAPIView):
    """
    用户日志列表
    记录用户登录、登出、密码修改等操作
    """
    permission_classes = [IsAuthenticated]
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
        enforce_activity_log_view_permission(request, '无权查看用户日志')
        queryset = UserLog.objects.select_related('user', 'operator').all()

        # 使用 DRF 分页器处理分页
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = UserLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # 如果不分页，直接返回
        serializer = UserLogSerializer(queryset, many=True)
        return success_response(serializer.data)


class ContentLogListView(BaseAPIView):
    """
    内容日志列表
    记录知识文档、试卷、题目等内容的创建、修改、删除
    """
    permission_classes = [IsAuthenticated]
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
        enforce_activity_log_view_permission(request, '无权查看内容日志')
        queryset = ContentLog.objects.select_related('operator').all()

        # 使用 DRF 分页器处理分页
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = ContentLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # 如果不分页，直接返回
        serializer = ContentLogSerializer(queryset, many=True)
        return success_response(serializer.data)


class OperationLogListView(BaseAPIView):
    """
    操作日志列表
    记录任务管理、评分、抽查、数据导出等操作
    """
    permission_classes = [IsAuthenticated]
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
        enforce_activity_log_view_permission(request, '无权查看操作日志')
        queryset = OperationLog.objects.select_related('operator').all()

        # 使用 DRF 分页器处理分页
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = OperationLogSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        # 如果不分页，直接返回
        serializer = OperationLogSerializer(queryset, many=True)
        return success_response(serializer.data)


class ActivityLogPolicyView(BaseAPIView):
    """
    活动日志策略管理
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取日志策略列表',
        description='获取动作级日志记录白名单',
        responses={200: ActivityLogPolicySerializer(many=True)},
        tags=['活动日志']
    )
    def get(self, request):
        enforce_activity_log_view_permission(request, '无权查看日志策略')
        ActivityLogService.sync_policies()
        queryset = ActivityLogPolicy.objects.all().order_by('category', 'group', 'label')
        serializer = ActivityLogPolicySerializer(queryset, many=True)
        return success_response(serializer.data)

    @extend_schema(
        summary='更新日志策略',
        description='更新动作级日志记录开关',
        request=ActivityLogPolicyUpdateSerializer,
        responses={
            200: ActivityLogPolicySerializer,
            403: OpenApiResponse(description='无权限'),
        },
        tags=['活动日志']
    )
    def patch(self, request):
        enforce_activity_log_policy_update_permission(request, '无权更新日志策略')
        serializer = ActivityLogPolicyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data['key']
        enabled = serializer.validated_data['enabled']
        policy = ActivityLogService._ensure_policy(key)
        policy.enabled = enabled
        policy.save(update_fields=['enabled', 'updated_at'])
        ActivityLogService.invalidate_policy_cache(key)
        return success_response(ActivityLogPolicySerializer(policy).data)
