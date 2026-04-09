"""
Activity logs views.
提供统一的日志查询接口与日志策略接口。
"""
from typing import Any

from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.users.models import User
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from core.responses import no_content_response, success_response

from .models import ActivityLogPolicy, ContentLog, OperationLog, UserLog
from .selectors import (
    apply_activity_log_filters,
    get_activity_log_queryset,
    list_activity_log_members,
)
from .serializers import (
    ActivityLogBulkDeleteSerializer,
    ActivityLogItemSerializer,
    ActivityLogListDataSerializer,
    ActivityLogPolicySerializer,
    ActivityLogPolicyUpdateSerializer,
    ActivityLogQuerySerializer,
    SimpleUserSerializer,
)
from .services import ActivityLogService

LOG_MODEL_MAP = {
    'user': UserLog,
    'content': ContentLog,
    'operation': OperationLog,
}


def enforce_activity_log_view_permission(request, error_message: str) -> None:
    enforce('activity_log.view', request, error_message=error_message)


def enforce_activity_log_policy_update_permission(request, error_message: str) -> None:
    enforce('activity_log.policy.update', request, error_message=error_message)


def enforce_activity_log_policy_access_permission(request, error_message: str) -> None:
    enforce('activity_log.policy.update', request, error_message=error_message)


def enforce_activity_log_delete_permission(request, error_message: str) -> None:
    enforce('activity_log.view', request, error_message=error_message)


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
        members_queryset = apply_activity_log_filters(
            get_activity_log_queryset(log_type),
            log_type,
            {
                key: value
                for key, value in params.items()
                if key != 'member_ids'
            },
        )
        queryset = apply_activity_log_filters(
            get_activity_log_queryset(log_type),
            log_type,
            params,
        )
        members = list_activity_log_members(members_queryset, log_type)

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


class ActivityLogUserListView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取日志成员用户池',
        description='返回可用于日志筛选的用户列表（不依赖是否有日志记录）',
        parameters=[
            OpenApiParameter(name='search', type=str, description='按姓名、工号或部门搜索'),
        ],
        responses={200: SimpleUserSerializer(many=True), 403: OpenApiResponse(description='无权限')},
        tags=['活动日志']
    )
    def get(self, request):
        enforce_activity_log_view_permission(request, '无权查看活动日志成员列表')

        queryset = (
            User.objects.filter(is_active=True)
            .select_related('department')
            .only('id', 'employee_id', 'username', 'avatar_key', 'department__name', 'department__code')
        )

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(employee_id__icontains=search)
                | Q(department__name__icontains=search)
            )

        queryset = queryset.order_by('department__code', 'employee_id', 'id')
        serializer = SimpleUserSerializer(queryset, many=True)
        return success_response(serializer.data)


class ActivityLogPolicyView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取日志策略列表',
        description='获取动作级日志记录白名单',
        responses={200: ActivityLogPolicySerializer(many=True)},
        tags=['活动日志']
    )
    def get(self, request):
        enforce_activity_log_policy_access_permission(request, '无权查看日志策略')
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
        enforce_activity_log_delete_permission(request, '无权删除活动日志')

        log_type, record_id = _parse_log_item_id(log_item_id)
        log = LOG_MODEL_MAP[log_type].objects.filter(pk=record_id).first()
        if log is None:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='活动日志不存在',
            )

        log.delete()
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
        enforce_activity_log_delete_permission(request, '无权删除活动日志')

        serializer = ActivityLogBulkDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grouped_ids = _group_log_ids(serializer.validated_data['item_ids'])
        deleted_count = _delete_logs(grouped_ids)
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


def _group_log_ids(log_item_ids: list[str]) -> dict[str, set[int]]:
    grouped_ids = {log_type: set() for log_type in LOG_MODEL_MAP}

    for log_item_id in log_item_ids:
        log_type, record_id = _parse_log_item_id(log_item_id)
        grouped_ids[log_type].add(record_id)

    return grouped_ids


def _delete_logs(grouped_ids: dict[str, set[int]]) -> int:
    querysets: list[tuple[type, set[int]]] = []
    deleted_count = 0

    for log_type, record_ids in grouped_ids.items():
        if not record_ids:
            continue

        model = LOG_MODEL_MAP[log_type]
        existing_ids = set(model.objects.filter(id__in=record_ids).values_list('id', flat=True))
        if existing_ids != record_ids:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='部分活动日志不存在',
            )

        querysets.append((model, record_ids))
        deleted_count += len(record_ids)

    with transaction.atomic():
        for model, record_ids in querysets:
            model.objects.filter(id__in=record_ids).delete()

    return deleted_count
