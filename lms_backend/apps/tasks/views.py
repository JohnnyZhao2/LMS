"""
Views for task management.

Implements task creation and management endpoints.

Requirements:
- 7.1, 7.2, 7.3, 7.4, 7.5: Learning task management
- 9.1, 9.2, 9.3, 9.4, 9.5: Practice task management
- 11.1, 11.2, 11.3, 11.4, 11.5, 11.6: Exam task management
- 20.1, 20.2, 20.3: Admin task management

Properties:
- Property 17: 导师任务学员范围限制
- Property 18: 室经理任务学员范围限制
- Property 19: 任务分配记录完整性
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import (
    IsAdminOrMentorOrDeptManager,
    get_current_role,
    filter_queryset_by_data_scope,
)

from .models import Task, TaskAssignment
from .serializers import (
    TaskListSerializer,
    TaskDetailSerializer,
    LearningTaskCreateSerializer,
    PracticeTaskCreateSerializer,
    ExamTaskCreateSerializer,
)


class LearningTaskCreateView(APIView):
    """
    Create learning task endpoint.
    
    Requirements:
    - 7.1: 创建学习任务时要求选择知识文档（可多选）和目标学员
    - 7.2: 导师创建学习任务时仅允许选择其名下学员
    - 7.3: 室经理创建学习任务时仅允许选择本室学员
    - 7.4: 管理员创建学习任务时允许选择任意学员
    - 7.5: 学习任务创建成功后为每个学员创建任务分配记录
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    @extend_schema(
        summary='创建学习任务',
        description='''
        创建学习任务并分配给学员。
        
        权限要求：
        - 导师：只能选择名下学员
        - 室经理：只能选择本室学员
        - 管理员：可以选择任意学员
        
        Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
        ''',
        request=LearningTaskCreateSerializer,
        responses={
            201: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或学员超出权限范围'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['任务管理']
    )
    def post(self, request):
        serializer = LearningTaskCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        
        response_serializer = TaskDetailSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class PracticeTaskCreateView(APIView):
    """
    Create practice task endpoint.
    
    Requirements:
    - 9.1: 创建练习任务时要求选择试卷（可多选）、可选关联知识文档和目标学员
    - 9.2: 导师创建练习任务时仅允许选择其名下学员
    - 9.3: 室经理创建练习任务时仅允许选择本室学员
    - 9.4: 管理员创建练习任务时允许选择任意学员
    - 9.5: 练习任务创建成功后为每个学员创建任务分配记录，初始状态为"进行中"
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    @extend_schema(
        summary='创建练习任务',
        description='''
        创建练习任务并分配给学员。
        
        权限要求：
        - 导师：只能选择名下学员
        - 室经理：只能选择本室学员
        - 管理员：可以选择任意学员
        
        Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
        ''',
        request=PracticeTaskCreateSerializer,
        responses={
            201: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或学员超出权限范围'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['任务管理']
    )
    def post(self, request):
        serializer = PracticeTaskCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        
        response_serializer = TaskDetailSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class ExamTaskCreateView(APIView):
    """
    Create exam task endpoint.
    
    Requirements:
    - 11.1: 创建考试任务时要求选择唯一试卷、设置考试时间窗口、限时和目标学员
    - 11.2: 用户设置考试规则时存储开始时间、截止时间、考试时长和及格分数
    - 11.3: 导师创建考试任务时仅允许选择其名下学员
    - 11.4: 室经理创建考试任务时仅允许选择本室学员
    - 11.5: 管理员创建考试任务时允许选择任意学员
    - 11.6: 考试任务创建成功后为每个学员创建任务分配记录，初始状态为"待考试"
    
    Properties:
    - Property 17: 导师任务学员范围限制
    - Property 18: 室经理任务学员范围限制
    - Property 19: 任务分配记录完整性
    - Property 27: 考试任务唯一试卷
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    @extend_schema(
        summary='创建考试任务',
        description='''
        创建考试任务并分配给学员。
        
        考试任务特点：
        - 只能选择一个试卷
        - 必须设置考试开始时间、截止时间、考试时长和及格分数
        - 学员初始状态为"待考试"
        
        权限要求：
        - 导师：只能选择名下学员
        - 室经理：只能选择本室学员
        - 管理员：可以选择任意学员
        
        Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
        ''',
        request=ExamTaskCreateSerializer,
        responses={
            201: TaskDetailSerializer,
            400: OpenApiResponse(description='参数错误或学员超出权限范围'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['任务管理']
    )
    def post(self, request):
        serializer = ExamTaskCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()
        
        response_serializer = TaskDetailSerializer(task)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class TaskListView(APIView):
    """
    Task list endpoint.
    
    Returns tasks based on user's role and data scope.
    
    Requirements: 20.1, 20.2
    """
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
            OpenApiParameter(name='task_type', type=str, description='任务类型（LEARNING/PRACTICE/EXAM）'),
            OpenApiParameter(name='is_closed', type=bool, description='是否已结束'),
        ],
        responses={200: TaskListSerializer(many=True)},
        tags=['任务管理']
    )
    def get(self, request):
        current_role = get_current_role(request.user)
        
        # Build base queryset
        if current_role == 'ADMIN':
            # Admin sees all tasks
            queryset = Task.objects.filter(is_deleted=False)
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            # Mentors and dept managers see tasks they created
            queryset = Task.objects.filter(
                is_deleted=False,
                created_by=request.user
            )
        else:
            # Students see tasks assigned to them
            assigned_task_ids = TaskAssignment.objects.filter(
                assignee=request.user
            ).values_list('task_id', flat=True)
            queryset = Task.objects.filter(
                is_deleted=False,
                id__in=assigned_task_ids
            )
        
        # Apply filters
        task_type = request.query_params.get('task_type')
        if task_type:
            queryset = queryset.filter(task_type=task_type)
        
        is_closed = request.query_params.get('is_closed')
        if is_closed is not None:
            is_closed_bool = is_closed.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_closed=is_closed_bool)
        
        queryset = queryset.select_related('created_by').order_by('-created_at')
        serializer = TaskListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TaskDetailView(APIView):
    """
    Task detail endpoint.
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        """Get task by ID."""
        try:
            return Task.objects.select_related(
                'created_by'
            ).prefetch_related(
                'task_knowledge__knowledge',
                'task_quizzes__quiz',
                'assignments__assignee'
            ).get(pk=pk, is_deleted=False)
        except Task.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在'
            )
    
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
        task = self.get_object(pk)
        
        # Check access permission
        current_role = get_current_role(request.user)
        if current_role == 'ADMIN':
            pass  # Admin can access all tasks
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            # Can access tasks they created
            if task.created_by != request.user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此任务'
                )
        else:
            # Students can only access tasks assigned to them
            if not task.assignments.filter(assignee=request.user).exists():
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此任务'
                )
        
        serializer = TaskDetailSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TaskCloseView(APIView):
    """
    Force close task endpoint.
    
    Only admins can force close tasks.
    
    Requirements:
    - 7.6: 管理员强制结束任务时将任务状态设为"已结束"，未完成的子任务标记为"已逾期"
    - 20.3: 管理员强制结束任务时将任务状态设为已结束
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        """Get task by ID."""
        try:
            return Task.objects.get(pk=pk, is_deleted=False)
        except Task.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在'
            )
    
    @extend_schema(
        summary='强制结束任务',
        description='''
        强制结束任务。
        
        - 只有管理员可以执行此操作
        - 任务状态将设为"已结束"
        - 未完成的分配记录将标记为"已逾期"
        
        Requirements: 7.6, 20.3
        ''',
        responses={
            200: TaskDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def post(self, request, pk):
        # Check admin permission
        current_role = get_current_role(request.user)
        if current_role != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以强制结束任务'
            )
        
        task = self.get_object(pk)
        
        # Check if task is already closed
        if task.is_closed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已经结束'
            )
        
        # Close the task
        task.close()
        
        # Refresh task data
        task.refresh_from_db()
        
        serializer = TaskDetailSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)
