"""任务管理 View。"""

from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.engine import authorize, enforce, scope_filter
from apps.tasks.analytics import build_task_abnormal_counts
from apps.tasks.management_serializers import (
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskResourceOptionSerializer,
    TaskUpdateSerializer,
)
from apps.tasks.selectors import document_resource_option_queryset, quiz_resource_option_queryset
from apps.tasks.services import TaskService
from apps.users.models import User
from apps.users.serializers import UserSerializer
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param
from core.responses import (
    created_response,
    list_response,
    no_content_response,
    success_response,
)


def _parse_positive_int_list_query_param(request, name: str) -> list[int]:
    raw_value = (request.query_params.get(name) or '').strip()
    if not raw_value:
        return []

    values: list[int] = []
    for raw_item in raw_value.split(','):
        item = raw_item.strip()
        if not item:
            continue
        try:
            value = int(item)
        except (TypeError, ValueError):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'参数 {name} 必须是逗号分隔的正整数列表',
            )
        if value < 1:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'参数 {name} 必须是逗号分隔的正整数列表',
            )
        values.append(value)

    return sorted(set(values))


class AssignableUserListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取可分配人员列表',
        parameters=[
            OpenApiParameter(name='search', type=str, description='按姓名或工号搜索'),
            OpenApiParameter(name='department_id', type=int, description='按部门筛选'),
        ],
        responses={200: UserSerializer(many=True)},
        tags=['任务管理'],
    )
    def get(self, request):
        enforce('task.assign', request, error_message='无权查看可分配人员列表')
        queryset = scope_filter(
            'task.assign',
            request,
            resource_model=User,
        ).select_related(
            'department', 'mentor'
        ).prefetch_related('roles').distinct()

        department_id = parse_int_query_param(
            request=request,
            name='department_id',
            minimum=1,
        )
        if department_id is not None:
            queryset = queryset.filter(department_id=department_id)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(employee_id__icontains=search)
            )

        queryset = queryset.order_by('username', 'employee_id')
        serializer = UserSerializer(queryset, many=True)
        return list_response(serializer.data)


class TaskResourceOptionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取任务资源库选项',
        description='按资源类型分页返回可选知识或试卷。',
        parameters=[
            OpenApiParameter(
                name='resource_type',
                type=str,
                description='资源类型：DOCUMENT / QUIZ',
                required=True,
            ),
            OpenApiParameter(name='quiz_type', type=str, description='试卷类型：PRACTICE / EXAM'),
            OpenApiParameter(name='search', type=str, description='搜索资源标题'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
            OpenApiParameter(name='exclude_document_ids', type=str, description='排除的知识 ID'),
            OpenApiParameter(name='exclude_quiz_ids', type=str, description='排除的试卷 ID'),
        ],
        responses={200: TaskResourceOptionSerializer(many=True)},
        tags=['任务管理'],
    )
    def get(self, request):
        if not (
            authorize('task.create', request).allowed
            or authorize('task.update', request).allowed
        ):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权查看任务资源库',
            )
        resource_type = (request.query_params.get('resource_type') or '').strip().upper()
        if resource_type not in {'DOCUMENT', 'QUIZ'}:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='参数 resource_type 仅支持 DOCUMENT、QUIZ',
            )

        search = request.query_params.get('search')
        exclude_document_ids = set(
            _parse_positive_int_list_query_param(request, 'exclude_document_ids')
        )
        exclude_quiz_ids = set(
            _parse_positive_int_list_query_param(request, 'exclude_quiz_ids')
        )
        quiz_type = (request.query_params.get('quiz_type') or '').strip().upper() or None
        if quiz_type and quiz_type not in {'PRACTICE', 'EXAM'}:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='参数 quiz_type 仅支持 PRACTICE、EXAM',
            )

        if resource_type == 'DOCUMENT':
            queryset = document_resource_option_queryset(
                request=request,
                search=search,
                exclude_ids=exclude_document_ids,
            )
        else:
            queryset = quiz_resource_option_queryset(
                request=request,
                search=search,
                exclude_ids=exclude_quiz_ids,
                quiz_type=quiz_type,
            )

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        if resource_type == 'DOCUMENT':
            payload = [
                {
                    'id': item.id,
                    'title': item.title,
                    'resource_type': 'DOCUMENT',
                    'space_tag_name': item.space_tag.name if item.space_tag else None,
                }
                for item in page
            ]
        else:
            payload = [
                {
                    'id': item.id,
                    'title': item.title,
                    'resource_type': 'QUIZ',
                    'quiz_type': item.quiz_type,
                    'question_count': item.question_count_value,
                }
                for item in page
            ]
        serializer = TaskResourceOptionSerializer(payload, many=True)
        return paginator.get_paginated_response(serializer.data)


class TaskCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='创建任务',
        request=TaskCreateSerializer,
        responses={
            201: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或学员超出权限范围'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['任务管理'],
    )
    def post(self, request):
        serializer = TaskCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        task = TaskService(request).create_task(**dict(serializer.validated_data))
        response_serializer = TaskDetailSerializer(task, context={'request': request})
        return created_response(response_serializer.data)


class TaskListView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取任务列表',
        parameters=[
            OpenApiParameter(
                name='status',
                type=str,
                description='任务状态筛选：open / closed / all',
            ),
            OpenApiParameter(name='search', type=str, description='按任务标题搜索'),
        ],
        responses={200: TaskListSerializer(many=True)},
        tags=['任务管理'],
    )
    def get(self, request):
        enforce('task.view', request, error_message='无权查看任务列表')
        queryset = self.service.get_task_queryset_for_user()

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(title__icontains=search)

        status = (request.query_params.get('status') or 'all').strip().lower()
        now = timezone.now()
        if status == 'open':
            queryset = queryset.filter(deadline__gt=now)
        elif status == 'closed':
            queryset = queryset.filter(deadline__lte=now)
        elif status != 'all':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='参数 status 仅支持 open、closed、all',
            )

        queryset = queryset.order_by('-created_at')
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        abnormal_counts = build_task_abnormal_counts([item.id for item in page])
        serializer = TaskListSerializer(
            page,
            many=True,
            context={'request': request, 'abnormal_counts': abnormal_counts},
        )
        return paginator.get_paginated_response(serializer.data)


class TaskDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取任务详情',
        responses={
            200: TaskDetailSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理'],
    )
    def get(self, request, pk):
        task = self.service.get_readable_task(pk)
        serializer = TaskDetailSerializer(task, context={'request': request})
        return success_response(serializer.data)

    @extend_schema(
        summary='更新任务',
        request=TaskUpdateSerializer,
        responses={
            200: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或任务已截止'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理'],
    )
    def patch(self, request, pk):
        serializer = TaskUpdateSerializer(
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        updated_task = self.service.update_task(pk=pk, **dict(serializer.validated_data))
        response_serializer = TaskDetailSerializer(
            self.service.get_task_by_id(updated_task.id),
            context={'request': request},
        )
        return success_response(response_serializer.data)

    @extend_schema(
        summary='删除任务',
        responses={
            200: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理'],
    )
    def delete(self, request, pk):
        self.service.delete_task(pk)
        return no_content_response()
