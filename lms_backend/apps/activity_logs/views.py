"""
Activity logs views.
提供统一的日志查询接口与日志策略接口。
"""
from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.services import AuthorizationService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
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


def enforce_activity_log_view_permission(request, error_message: str) -> None:
    AuthorizationService(request).enforce('activity_log.view', error_message=error_message)


def enforce_activity_log_policy_update_permission(request, error_message: str) -> None:
    AuthorizationService(request).enforce('activity_log.policy.update', error_message=error_message)


class ActivityLogListView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        summary='获取日志列表',
        description='获取统一日志列表，返回成员聚合与分页明细',
        parameters=[
            OpenApiParameter(name='type', type=str, description='日志类型：user|content|operation', required=True),
            OpenApiParameter(name='member_ids', type=str, description='行为主动方 ID 列表，逗号分隔'),
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
        enforce_activity_log_view_permission(request, '无权查看活动日志')

        params = self._validated_query_params(request.query_params)
        log_type = params['type']
        queryset = apply_activity_log_filters(
            get_activity_log_queryset(log_type),
            log_type,
            params,
        )
        members = list_activity_log_members(queryset, log_type)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = ActivityLogItemSerializer(page, many=True, context={'log_type': log_type})

        return success_response(
            {
                'members': members,
                'results': serializer.data,
                'count': paginator.page.paginator.count,
                'page': paginator.page.number,
                'page_size': paginator.get_page_size(request),
            }
        )

    def _validated_query_params(self, query_params) -> dict[str, Any]:
        serializer = ActivityLogQuerySerializer(data=query_params)
        if serializer.is_valid():
            return serializer.validated_data

        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=_extract_validation_message(serializer.errors),
            details=serializer.errors,
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


def _extract_validation_message(errors: Any) -> str:
    if isinstance(errors, dict):
        first_value = next(iter(errors.values()))
        return _extract_validation_message(first_value)
    if isinstance(errors, list) and errors:
        return _extract_validation_message(errors[0])
    return str(errors)
