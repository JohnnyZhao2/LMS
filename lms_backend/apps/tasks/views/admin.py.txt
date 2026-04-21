"""
Task management views for admin/mentor/dept_manager.
Implements:
- Task CRUD
- Assignable user list
"""
from math import ceil
from typing import Optional

from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.engine import authorize, enforce, scope_filter
from apps.tasks.serializers import (
    TaskCreateSerializer,
    TaskDetailSerializer,
    TaskListSerializer,
    TaskResourceOptionSerializer,
    TaskUpdateSerializer,
)
from apps.tasks.selectors import task_resource_options
from apps.tasks.task_service import TaskService
from apps.users.models import User
from apps.users.serializers import UserListSerializer
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param
from core.responses import (
    created_response,
    list_response,
    no_content_response,
    paginated_response,
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
    """List students that the current user can assign tasks to."""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取可分配学员列表',
        description='''
        根据当前用户的角色和数据范围返回可分配的学员列表。
        - 管理员：全平台所有学员
        - 导师：仅名下学员
        - 室经理：仅本室学员
        ''',
        parameters=[
            OpenApiParameter(name='search', type=str, description='按姓名或工号搜索'),
            OpenApiParameter(name='department_id', type=int, description='按部门筛选'),
        ],
        responses={200: UserListSerializer(many=True)},
        tags=['任务管理']
    )
    def get(self, request):
        enforce('task.assign', request, error_message='无权查看可分配学员列表')
        queryset = scope_filter(
            'task.assign',
            request,
            resource_model=User,
        ).filter(
            roles__code='STUDENT'
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
        serializer = UserListSerializer(queryset, many=True)
        return list_response(serializer.data)


class TaskResourceOptionListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取任务资源库选项',
        description='获取任务表单可选择的资源，支持统一搜索与分页。',
        parameters=[
            OpenApiParameter(name='resource_type', type=str, description='资源类型：ALL / DOCUMENT / QUIZ'),
            OpenApiParameter(name='search', type=str, description='搜索资源标题；知识同时支持内容搜索'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
            OpenApiParameter(name='exclude_document_ids', type=str, description='排除的知识 ID，逗号分隔'),
            OpenApiParameter(name='exclude_quiz_ids', type=str, description='排除的试卷 ID，逗号分隔'),
        ],
        responses={200: TaskResourceOptionSerializer(many=True)},
        tags=['任务管理']
    )
    def get(self, request):
        if not (
            authorize('task.create', request).allowed
            or authorize('task.update', request).allowed
        ):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权查看任务资源库'
            )
        resource_type = (request.query_params.get('resource_type') or 'ALL').strip().upper()
        if resource_type not in {'ALL', 'DOCUMENT', 'QUIZ'}:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='参数 resource_type 仅支持 ALL、DOCUMENT、QUIZ'
            )
        search = request.query_params.get('search')
        exclude_document_ids = _parse_positive_int_list_query_param(request, 'exclude_document_ids')
        exclude_quiz_ids = _parse_positive_int_list_query_param(request, 'exclude_quiz_ids')
        items = task_resource_options(
            request=request,
            search=search,
            resource_type=resource_type,
            exclude_document_ids=set(exclude_document_ids),
            exclude_quiz_ids=set(exclude_quiz_ids),
        )

        page = parse_int_query_param(request=request, name='page', default=1, minimum=1) or 1
        page_size = parse_int_query_param(
            request=request,
            name='page_size',
            default=StandardResultsSetPagination.page_size,
            minimum=1,
            maximum=StandardResultsSetPagination.max_page_size,
        ) or StandardResultsSetPagination.page_size

        total_count = len(items)
        total_pages = max(1, ceil(total_count / page_size))
        current_page = min(page, total_pages)
        start = (current_page - 1) * page_size
        end = start + page_size
        page_items = items[start:end]

        query_params = request.query_params.copy()

        def build_page_url(target_page: Optional[int]) -> Optional[str]:
            if target_page is None or target_page < 1 or target_page > total_pages:
                return None
            next_query_params = query_params.copy()
            next_query_params['page'] = str(target_page)
            next_query_params['page_size'] = str(page_size)
            return request.build_absolute_uri(f'{request.path}?{next_query_params.urlencode()}')

        serializer = TaskResourceOptionSerializer(page_items, many=True)
        return success_response(data={
            'count': total_count,
            'total_pages': total_pages,
            'current_page': current_page,
            'page_size': page_size,
            'next': build_page_url(current_page + 1 if current_page < total_pages else None),
            'previous': build_page_url(current_page - 1 if current_page > 1 else None),
            'results': serializer.data,
        })


class TaskCreateView(APIView):
    """统一的任务创建 API"""
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='创建任务',
        description='''
        创建任务并分配给学员。
        一个任务可以包含：
        - knowledge_ids: 知识文档列表（可选）
        - quiz_ids: 试卷列表（可选）
        - 至少需要选择一个知识文档或试卷
        ''',
        request=TaskCreateSerializer,
        responses={
            201: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或学员超出权限范围'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['任务管理']
    )
    def post(self, request):
        enforce('task.create', request, error_message='无权创建任务')
        serializer = TaskCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        task = TaskService(request).create_task(**dict(serializer.validated_data))
        response_serializer = TaskDetailSerializer(task, context={'request': request})
        return created_response(response_serializer.data)


class TaskListView(BaseAPIView):
    """Task list endpoint."""
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取任务列表',
        description='''
        获取任务列表，根据用户角色返回不同范围的数据：
        - 管理员：全平台所有任务
        - 导师：自己创建的任务
        - 室经理：自己创建的任务
        - 学员：分配给自己的任务
        ''',
        parameters=[
            OpenApiParameter(
                name='status',
                type=str,
                description='任务状态筛选：open(未截止) / closed(已截止) / all(全部)'
            ),
            OpenApiParameter(
                name='search',
                type=str,
                description='按任务标题搜索'
            ),
            OpenApiParameter(
                name='creator_side',
                type=str,
                description='任务来源筛选（仅管理员有效）：all / management(ADMIN角色创建) / non_management(非ADMIN角色创建)'
            ),
        ],
        responses={200: TaskListSerializer(many=True)},
        tags=['任务管理']
    )
    def get(self, request):
        enforce('task.view', request, error_message='无权查看任务列表')
        # Use TaskService to get queryset based on user role
        queryset = self.service.get_task_queryset_for_user()

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(title__icontains=search)

        creator_side = request.query_params.get('creator_side')
        queryset = self.service.filter_task_queryset_by_creator_side(queryset, creator_side)

        status = (request.query_params.get('status') or 'all').strip().lower()
        now = timezone.now()
        if status == 'open':
            queryset = queryset.filter(deadline__gt=now)
        elif status == 'closed':
            queryset = queryset.filter(deadline__lte=now)
        elif status != 'all':
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='参数 status 仅支持 open、closed、all'
            )
            
        queryset = queryset.order_by('-created_at')

        # Apply pagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = TaskListSerializer(page, many=True, context={'request': request})
        return paginated_response(page, serializer.data, paginator)


class TaskDetailView(BaseAPIView):
    """Task detail, update, and delete endpoint."""
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取任务详情',
        description='获取指定任务的详细信息',
        responses={
            200: TaskDetailSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_read_permission(task)
        serializer = TaskDetailSerializer(task, context={'request': request})
        return success_response(serializer.data)

    @extend_schema(
        summary='更新任务',
        description='更新任务信息。已截止的任务无法修改。',
        request=TaskUpdateSerializer,
        responses={
            200: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或任务已截止'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def patch(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_edit_permission(task, 'task.update', '无权更新任务')

        if task.deadline <= timezone.now():
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已截止，无法修改'
            )
            
        serializer = TaskUpdateSerializer(
            task,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        updated_task = self.service.update_task(task=task, **dict(serializer.validated_data))
        response_serializer = TaskDetailSerializer(updated_task, context={'request': request})
        return success_response(response_serializer.data)

    @extend_schema(
        summary='删除任务',
        description='删除任务（硬删除）。',
        responses={
            200: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def delete(self, request, pk):
        task = self.service.get_task_by_id(pk)
        self.service.check_task_edit_permission(task, 'task.delete', '无权删除任务')
        self.service.delete_task(task)
        return no_content_response()
