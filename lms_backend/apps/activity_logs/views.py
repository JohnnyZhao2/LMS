"""
Activity logs views.
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from core.base_view import BaseAPIView
from core.pagination import StandardResultsSetPagination
from core.responses import success_response

from .models import ActivityLogPolicy
from .selectors import (
    apply_activity_log_filters,
    get_activity_log_queryset,
    list_activity_log_members,
)
from .serializers import (
    ActivityLogItemSerializer,
    ActivityLogListDataSerializer,
    ActivityLogPolicySerializer,
    ActivityLogPolicyUpdateSerializer,
    ActivityLogQuerySerializer,
)
from .services import ActivityLogService


class ActivityLogListView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        summary='获取日志列表',
        description='获取统一日志列表，返回成员聚合与分页明细',
        parameters=[
            OpenApiParameter(name='type', type=str, description='日志类型：user|content|operation', required=True),
            OpenApiParameter(name='member_ids', type=str, description='行为主体 ID 列表，逗号分隔'),
            OpenApiParameter(name='search', type=str, description='搜索关键词'),
            OpenApiParameter(name='date_from', type=str, description='开始日期 YYYY-MM-DD'),
            OpenApiParameter(name='date_to', type=str, description='结束日期 YYYY-MM-DD'),
            OpenApiParameter(name='action', type=str, description='动作过滤'),
            OpenApiParameter(name='status', type=str, description='状态过滤'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: ActivityLogListDataSerializer, 403: OpenApiResponse(description='无权限')},
        tags=['活动日志']
    )
    def get(self, request):
        enforce('activity_log.view', request, error_message='无权查看活动日志')

        serializer = ActivityLogQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        base_queryset = get_activity_log_queryset(params['type'])
        member_filters = {key: value for key, value in params.items() if key != 'member_ids'}
        members = list_activity_log_members(
            apply_activity_log_filters(base_queryset, member_filters)
        )
        queryset = apply_activity_log_filters(base_queryset, params)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        results = ActivityLogItemSerializer(page, many=True).data

        return success_response(
            {
                'members': members,
                'results': results,
                'count': paginator.page.paginator.count,
                'page': paginator.page.number,
                'page_size': paginator.get_page_size(request),
            }
        )


class ActivityLogPolicyView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取日志策略列表',
        description='获取动作级日志记录白名单',
        responses={200: ActivityLogPolicySerializer(many=True)},
        tags=['活动日志']
    )
    def get(self, request):
        enforce('activity_log.policy.update', request, error_message='无权查看日志策略')
        ActivityLogService.sync_policies()
        serializer = ActivityLogPolicySerializer(
            ActivityLogPolicy.objects.all().order_by('category', 'group', 'label'),
            many=True,
        )
        return success_response(serializer.data)

    @extend_schema(
        summary='更新日志策略',
        description='更新动作级日志记录开关',
        request=ActivityLogPolicyUpdateSerializer,
        responses={200: ActivityLogPolicySerializer, 403: OpenApiResponse(description='无权限')},
        tags=['活动日志']
    )
    def patch(self, request):
        enforce('activity_log.policy.update', request, error_message='无权更新日志策略')
        serializer = ActivityLogPolicyUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        policy = ActivityLogService.set_policy_enabled(
            serializer.validated_data['key'],
            serializer.validated_data['enabled'],
        )
        return success_response(ActivityLogPolicySerializer(policy).data)
