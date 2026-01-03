"""
Task management views for admin/mentor/dept_manager.

Implements:
- Task CRUD
- Task close
- Assignable user list
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from django.db.models import Q

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import (
    IsAdminOrMentorOrDeptManager,
    get_current_role,
    get_accessible_students,
)
from apps.users.serializers import UserListSerializer
from apps.tasks.models import Task, TaskAssignment
from apps.tasks.serializers import (
    TaskListSerializer,
    TaskDetailSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
)
from apps.tasks.services import TaskService


class AssignableUserListView(APIView):
    """List students that the current user can assign tasks to."""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
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
        current_role = get_current_role(request.user)
        queryset = get_accessible_students(request.user, current_role).filter(
            roles__code='STUDENT'
        ).select_related(
            'department', 'mentor'
        ).prefetch_related('roles').distinct()
        
        department_id = request.query_params.get('department_id')
        if department_id:
            try:
                queryset = queryset.filter(department_id=int(department_id))
            except (TypeError, ValueError):
                pass
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(employee_id__icontains=search)
            )
        
        queryset = queryset.order_by('username', 'employee_id')
        
        serializer = UserListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TaskCreateView(APIView):
    """统一的任务创建 API"""
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
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
        serializer = TaskCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        
        response_serializer = TaskDetailSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class TaskListView(APIView):
    """Task list endpoint."""
    permission_classes = [IsAuthenticated]
    
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
            OpenApiParameter(name='is_closed', type=bool, description='是否已结束'),
        ],
        responses={200: TaskListSerializer(many=True)},
        tags=['任务管理']
    )
    def get(self, request):
        # Use TaskService to get queryset based on user role
        queryset = TaskService.get_task_queryset_for_user(request.user)
        
        is_closed = request.query_params.get('is_closed')
        if is_closed is not None:
            is_closed_bool = is_closed.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_closed=is_closed_bool)
        
        queryset = queryset.select_related('created_by').order_by('-created_at')
        serializer = TaskListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TaskDetailView(APIView):
    """Task detail, update, and delete endpoint."""
    permission_classes = [IsAuthenticated]
    
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
        task = TaskService.get_task_by_id(pk)
        TaskService.check_task_read_permission(task, request.user)
        
        serializer = TaskDetailSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='更新任务',
        description='更新任务信息。已关闭的任务无法修改。',
        request=TaskUpdateSerializer,
        responses={
            200: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或任务已关闭'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def patch(self, request, pk):
        task = TaskService.get_task_by_id(pk)
        TaskService.check_task_edit_permission(task, request.user)
        
        if task.is_closed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已关闭，无法修改'
            )
        
        serializer = TaskUpdateSerializer(
            task,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        updated_task = serializer.save()
        
        response_serializer = TaskDetailSerializer(updated_task)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='删除任务',
        description='删除任务（软删除）。',
        responses={
            204: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def delete(self, request, pk):
        task = TaskService.get_task_by_id(pk)
        TaskService.check_task_edit_permission(task, request.user)
        
        TaskService.delete_task(task)
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskCloseView(APIView):
    """Force close task endpoint."""
    permission_classes = [IsAuthenticated]
    serializer_class = TaskDetailSerializer
    
    @extend_schema(
        summary='强制结束任务',
        description='强制结束任务。只有管理员可以执行此操作。',
        responses={
            200: TaskDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def post(self, request, pk):
        current_role = get_current_role(request.user)
        if current_role != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以强制结束任务'
            )
        
        task = TaskService.get_task_by_id(pk)
        task = TaskService.close_task(task)
        
        serializer = TaskDetailSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)
