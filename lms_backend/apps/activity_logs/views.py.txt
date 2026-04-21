"""
Activity logs views.
"""
from typing import Any

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from core.responses import no_content_response, success_response

from .models import ActivityLog, ActivityLogPolicy
from .selectors import (
    apply_activity_log_filters,
    get_activity_log_queryset,
    list_activity_log_members,
    serialize_activity_log_item,
)
from .serializers import (
    ActivityLogBulkDeleteSerializer,
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

        params = self._validated_query_params(request.query_params)
        base_queryset = get_activity_log_queryset(params['type'])
        members = list_activity_log_members(
            apply_activity_log_filters(
                base_queryset,
                {key: value for key, value in params.items() if key != 'member_ids'},
            )
        )
        queryset = apply_activity_log_filters(base_queryset, params)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        results = [serialize_activity_log_item(log) for log in page]
        serializer = ActivityLogItemSerializer(results, many=True)

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
        key = serializer.validated_data['key']
        policy = ActivityLogService._ensure_policy(key)
        policy.enabled = serializer.validated_data['enabled']
        policy.save(update_fields=['enabled', 'updated_at'])
        ActivityLogService.invalidate_policy_cache(key)
        return success_response(ActivityLogPolicySerializer(policy).data)


class ActivityLogItemView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='删除日志',
        description='根据日志项 ID 删除单条活动日志记录',
        responses={
            200: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='日志不存在'),
        },
        tags=['活动日志']
    )
    def delete(self, request, log_item_id: str):
        enforce('activity_log.view', request, error_message='无权删除活动日志')

        category, record_id = _parse_log_item_id(log_item_id)
        deleted_count, _ = ActivityLog.objects.filter(id=record_id, category=category).delete()
        if deleted_count == 0:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='活动日志不存在',
            )

        return no_content_response()


class ActivityLogBulkDeleteView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='批量删除日志',
        description='根据日志项 ID 列表批量删除活动日志记录',
        request=ActivityLogBulkDeleteSerializer,
        responses={
            200: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='日志不存在'),
        },
        tags=['活动日志']
    )
    def post(self, request):
        enforce('activity_log.view', request, error_message='无权删除活动日志')

        serializer = ActivityLogBulkDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item_refs = [_parse_log_item_id(item_id) for item_id in serializer.validated_data['item_ids']]
        existing_refs = set(
            ActivityLog.objects.filter(id__in=[record_id for _, record_id in item_refs])
            .values_list('category', 'id')
        )
        requested_refs = set(item_refs)
        if existing_refs != requested_refs:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='部分活动日志不存在',
            )

        deleted_count, _ = ActivityLog.objects.filter(
            id__in=[record_id for _, record_id in requested_refs]
        ).delete()
        return success_response({'deleted_count': deleted_count})


def _extract_validation_message(errors: Any) -> str:
    if isinstance(errors, dict):
        first_value = next(iter(errors.values()))
        return _extract_validation_message(first_value)
    if isinstance(errors, list) and errors:
        return _extract_validation_message(errors[0])
    return str(errors)


def _parse_log_item_id(log_item_id: str) -> tuple[str, int]:
    try:
        log_type, raw_id = log_item_id.split('-', 1)
    except ValueError as exc:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='日志项 ID 格式无效',
        ) from exc

    if log_type not in {'user', 'content', 'operation'}:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='日志类型无效',
        )

    try:
        record_id = int(raw_id)
    except ValueError as exc:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='日志记录 ID 无效',
        ) from exc

    return log_type, record_id
