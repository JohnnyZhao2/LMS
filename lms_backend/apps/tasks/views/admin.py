"""
Task management views for admin/mentor/dept_manager.
Implements:
- Task CRUD
- Assignable user list
"""
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
        items = task_resource_options(search=search, resource_type=resource_type)
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(items, request)
        serializer = TaskResourceOptionSerializer(page, many=True)
        return paginated_response(page, serializer.data, paginator)


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
        task = serializer.save()
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
        updated_task = serializer.save()
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
