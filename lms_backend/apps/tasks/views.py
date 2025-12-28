"""
Views for task management.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from django.db.models import Q
from django.utils import timezone

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import (
    IsAdminOrMentorOrDeptManager,
    get_current_role,
    get_accessible_students,
)
from apps.users.serializers import UserListSerializer

from .models import Task, TaskAssignment, TaskKnowledge, KnowledgeLearningProgress
from .serializers import (
    TaskListSerializer,
    TaskDetailSerializer,
    TaskCreateSerializer,
    TaskUpdateSerializer,
    StudentAssignmentListSerializer,
    StudentTaskDetailSerializer,
    CompleteKnowledgeLearningSerializer,
    KnowledgeLearningProgressSerializer,
)


class AssignableUserListView(APIView):
    """
    List students that the current user can assign tasks to.
    """
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
            OpenApiParameter(
                name='search',
                type=str,
                description='按姓名或工号搜索'
            ),
            OpenApiParameter(
                name='department_id',
                type=int,
                description='按部门筛选'
            ),
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
    """
    统一的任务创建 API
    
    一个任务可以包含任意组合的知识文档和试卷。
    """
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    
    @extend_schema(
        summary='创建任务',
        description='''
        创建任务并分配给学员。
        
        一个任务可以包含：
        - knowledge_ids: 知识文档列表（可选）
        - quiz_ids: 试卷列表（可选）
        - 至少需要选择一个知识文档或试卷
        
        权限要求：
        - 导师：只能选择名下学员
        - 室经理：只能选择本室学员
        - 管理员：可以选择任意学员
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
    """
    Task list endpoint.
    
    Returns tasks based on user's role and data scope.
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
        is_closed = request.query_params.get('is_closed')
        if is_closed is not None:
            is_closed_bool = is_closed.lower() in ('true', '1', 'yes')
            queryset = queryset.filter(is_closed=is_closed_bool)
        
        queryset = queryset.select_related('created_by').order_by('-created_at')
        serializer = TaskListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TaskDetailView(APIView):
    """
    Task detail, update, and delete endpoint.
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
    
    def check_edit_permission(self, task, user):
        """检查用户是否有编辑任务的权限。"""
        current_role = get_current_role(user)
        if current_role == 'ADMIN':
            return True  # Admin can edit all tasks
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            # Can only edit tasks they created
            if task.created_by != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权操作此任务'
                )
            return True
        else:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员和导师可以操作任务'
            )
    
    def check_read_permission(self, task, user):
        """检查用户是否有查看任务的权限。"""
        current_role = get_current_role(user)
        if current_role == 'ADMIN':
            return True  # Admin can access all tasks
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            # Can access tasks they created
            if task.created_by != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此任务'
                )
            return True
        else:
            # Students can only access tasks assigned to them
            if not task.assignments.filter(assignee=user).exists():
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此任务'
                )
            return True
    
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
        self.check_read_permission(task, request.user)
        
        serializer = TaskDetailSerializer(task)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='更新任务',
        description='''
        更新任务信息。
        
        权限要求：
        - 管理员：可以更新所有任务
        - 导师：只能更新自己创建的任务
        
        注意：已关闭的任务无法修改。
        ''',
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
        """部分更新任务信息"""
        task = self.get_object(pk)
        self.check_edit_permission(task, request.user)
        
        # 检查任务是否已关闭
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
        description='''
        删除任务（软删除）。
        
        权限要求：
        - 管理员：可以删除所有任务
        - 导师：只能删除自己创建的任务
        ''',
        responses={
            204: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务管理']
    )
    def delete(self, request, pk):
        """删除任务（软删除）"""
        task = self.get_object(pk)
        self.check_edit_permission(task, request.user)
        
        # 软删除任务
        task.is_deleted = True
        task.save(update_fields=['is_deleted'])
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class TaskCloseView(APIView):
    """Force close task endpoint."""
    permission_classes = [IsAuthenticated]
    serializer_class = TaskDetailSerializer
    
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


class StudentAssignmentListView(APIView):
    """Student's task assignment list endpoint."""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取我的任务列表',
        description='''
        获取当前学员的任务分配列表。
        
        支持筛选：
        - status: 任务状态（IN_PROGRESS/COMPLETED/OVERDUE）
        ''',
        parameters=[
            OpenApiParameter(name='status', type=str, description='任务状态（IN_PROGRESS/COMPLETED/OVERDUE）'),
        ],
        responses={200: StudentAssignmentListSerializer(many=True)},
        tags=['学员任务执行']
    )
    def get(self, request):
        # Get assignments for current user
        queryset = TaskAssignment.objects.filter(
            assignee=request.user,
            task__is_deleted=False
        ).select_related(
            'task', 'task__created_by'
        ).prefetch_related(
            'task__task_knowledge__knowledge',
            'task__task_quizzes__quiz',
            'knowledge_progress'
        )
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Check and update overdue status for each assignment
        now = timezone.now()
        for assignment in queryset:
            if assignment.status not in ['COMPLETED', 'OVERDUE'] and assignment.task.deadline < now:
                assignment.mark_overdue()
        
        queryset = queryset.order_by('-task__created_at')
        serializer = StudentAssignmentListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentTaskDetailView(APIView):
    """Student's task detail endpoint."""
    permission_classes = [IsAuthenticated]
    
    def get_assignment(self, task_id, user):
        """Get task assignment for the user."""
        try:
            assignment = TaskAssignment.objects.select_related(
                'task', 'task__created_by'
            ).prefetch_related(
                'task__task_knowledge__knowledge',
                'task__task_quizzes__quiz',
                'knowledge_progress__task_knowledge__knowledge'
            ).get(
                task_id=task_id,
                assignee=user,
                task__is_deleted=False
            )
            
            # Check and update overdue status
            assignment.check_and_update_overdue()
            
            return assignment
        except TaskAssignment.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在或未分配给您'
            )
    
    @extend_schema(
        summary='获取任务详情',
        description='''
        获取学员的任务详情，包括：
        - 任务基本信息（标题、介绍、分配人、截止时间）
        - 整体进度
        - 知识文档列表及学习状态
        - 试卷列表
        ''',
        responses={
            200: StudentTaskDetailSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['学员任务执行']
    )
    def get(self, request, task_id):
        assignment = self.get_assignment(task_id, request.user)
        
        # Ensure knowledge progress records exist for all task knowledge items
        self._ensure_knowledge_progress(assignment)
        
        serializer = StudentTaskDetailSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def _ensure_knowledge_progress(self, assignment):
        """Ensure KnowledgeLearningProgress records exist for all task knowledge items."""
        task_knowledge_items = assignment.task.task_knowledge.all()
        existing_progress = set(
            assignment.knowledge_progress.values_list('task_knowledge_id', flat=True)
        )
        
        for tk in task_knowledge_items:
            if tk.id not in existing_progress:
                KnowledgeLearningProgress.objects.create(
                    assignment=assignment,
                    task_knowledge=tk,
                    is_completed=False
                )


class CompleteKnowledgeLearningView(APIView):
    """Complete knowledge learning endpoint."""
    permission_classes = [IsAuthenticated]
    
    def get_assignment(self, task_id, user):
        """Get task assignment for the user."""
        try:
            return TaskAssignment.objects.select_related(
                'task'
            ).prefetch_related(
                'task__task_knowledge',
                'knowledge_progress'
            ).get(
                task_id=task_id,
                assignee=user,
                task__is_deleted=False
            )
        except TaskAssignment.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在或未分配给您'
            )
    
    @extend_schema(
        summary='完成知识学习',
        description='''
        标记知识文档为已学习。
        
        - 记录完成状态和完成时间
        - 当所有知识都完成时，自动将任务状态设为已完成（如果任务没有试卷的话）
        ''',
        request=CompleteKnowledgeLearningSerializer,
        responses={
            200: KnowledgeLearningProgressSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或知识不存在'),
        },
        tags=['学员任务执行']
    )
    def post(self, request, task_id):
        assignment = self.get_assignment(task_id, request.user)
        
        # Check and update overdue status first
        assignment.check_and_update_overdue()
        
        # Check if task is already completed or overdue
        if assignment.status == 'COMPLETED':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已完成'
            )
        
        if assignment.status == 'OVERDUE':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已逾期，无法继续学习'
            )
        
        # Validate request data
        serializer = CompleteKnowledgeLearningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        knowledge_id = serializer.validated_data['knowledge_id']
        
        # Find the task knowledge item
        try:
            task_knowledge = TaskKnowledge.objects.get(
                task=assignment.task,
                knowledge_id=knowledge_id
            )
        except TaskKnowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='该知识文档不在此任务中'
            )
        
        # Get or create progress record
        progress, created = KnowledgeLearningProgress.objects.get_or_create(
            assignment=assignment,
            task_knowledge=task_knowledge,
            defaults={'is_completed': False}
        )
        
        # Check if already completed
        if progress.is_completed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='该知识已标记为已学习'
            )
        
        # Mark as completed
        progress.mark_completed()
        
        # Refresh to get updated data
        progress.refresh_from_db()
        assignment.refresh_from_db()
        
        response_serializer = KnowledgeLearningProgressSerializer(progress)
        response_data = response_serializer.data
        
        # Include task completion status in response
        response_data['task_status'] = assignment.status
        response_data['task_completed'] = assignment.status == 'COMPLETED'
        
        return Response(response_data, status=status.HTTP_200_OK)

