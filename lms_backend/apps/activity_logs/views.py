"""
Activity logs views.
提供用户日志、内容日志、操作日志的查询接口。
"""
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response
from core.pagination import StandardResultsSetPagination
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from .models import ActivityLogPolicy, UserLog, ContentLog, OperationLog
from .serializers import (
    ActivityLogPolicySerializer,
    ActivityLogPolicyUpdateSerializer,
    UserLogSerializer,
    ContentLogSerializer,
    OperationLogSerializer,
)
from .services import ActivityLogService


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
        return success_response(serializer.data)


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
        return success_response(serializer.data)


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
        return success_response(serializer.data)


class ActivityLogPolicyView(BaseAPIView):
    """
    活动日志策略管理（仅超级用户）
    """
    permission_classes = [IsAuthenticated]

    def _ensure_superuser(self, request):
        if not request.user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='仅超级用户可管理日志策略'
            )

    @extend_schema(
        summary='获取日志策略列表',
        description='获取动作级日志记录白名单（仅超级用户）',
        responses={200: ActivityLogPolicySerializer(many=True)},
        tags=['活动日志']
    )
    def get(self, request):
        self._ensure_superuser(request)
        ActivityLogService.sync_policies()
        queryset = ActivityLogPolicy.objects.all().order_by('category', 'group', 'label')
        serializer = ActivityLogPolicySerializer(queryset, many=True)
        return success_response(serializer.data)

    @extend_schema(
        summary='更新日志策略',
        description='更新动作级日志记录开关（仅超级用户）',
        request=ActivityLogPolicyUpdateSerializer,
        responses={
            200: ActivityLogPolicySerializer,
            403: OpenApiResponse(description='无权限'),
        },
        tags=['活动日志']
    )
    def patch(self, request):
        self._ensure_superuser(request)
        serializer = ActivityLogPolicyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        key = serializer.validated_data['key']
        enabled = serializer.validated_data['enabled']
        policy = ActivityLogService._ensure_policy(key)
        policy.enabled = enabled
        policy.save(update_fields=['enabled', 'updated_at'])
        ActivityLogService.invalidate_policy_cache(key)
        return success_response(ActivityLogPolicySerializer(policy).data)
