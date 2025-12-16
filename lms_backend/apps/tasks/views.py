"""
Views for task management.

Implements task creation and management endpoints.

Requirements:
- 7.1, 7.2, 7.3, 7.4, 7.5: Learning task management
- 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7: Learning task execution
- 9.1, 9.2, 9.3, 9.4, 9.5: Practice task management
- 11.1, 11.2, 11.3, 11.4, 11.5, 11.6: Exam task management
- 20.1, 20.2, 20.3: Admin task management

Properties:
- Property 17: 导师任务学员范围限制
- Property 18: 室经理任务学员范围限制
- Property 19: 任务分配记录完整性
- Property 20: 知识学习完成记录
- Property 21: 学习任务自动完成
- Property 22: 知识浏览不影响任务
- Property 23: 任务逾期状态标记
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from django.utils import timezone

from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import (
    IsAdminOrMentorOrDeptManager,
    get_current_role,
    filter_queryset_by_data_scope,
)

from .models import Task, TaskAssignment, TaskKnowledge, KnowledgeLearningProgress
from .serializers import (
    TaskListSerializer,
    TaskDetailSerializer,
    LearningTaskCreateSerializer,
    PracticeTaskCreateSerializer,
    ExamTaskCreateSerializer,
    StudentAssignmentListSerializer,
    StudentLearningTaskDetailSerializer,
    CompleteKnowledgeLearningSerializer,
    KnowledgeLearningProgressSerializer,
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


class StudentAssignmentListView(APIView):
    """
    Student's task assignment list endpoint.
    
    Returns tasks assigned to the current student.
    
    Requirements:
    - 8.1: 学员查看学习任务详情时展示任务标题、介绍、分配人、截止时间、整体进度和知识文档列表
    - 17.1: 学员访问任务中心时展示任务列表，支持按类型和状态筛选
    - 17.2: 学员查看任务列表时展示任务标题、类型、状态、截止时间和进度
    
    Properties:
    - Property 23: 任务逾期状态标记
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取我的任务列表',
        description='''
        获取当前学员的任务分配列表。
        
        支持筛选：
        - task_type: 任务类型（LEARNING/PRACTICE/EXAM）
        - status: 任务状态（IN_PROGRESS/COMPLETED/OVERDUE/PENDING_EXAM）
        
        Requirements: 8.1, 17.1, 17.2
        ''',
        parameters=[
            OpenApiParameter(name='task_type', type=str, description='任务类型（LEARNING/PRACTICE/EXAM）'),
            OpenApiParameter(name='status', type=str, description='任务状态（IN_PROGRESS/COMPLETED/OVERDUE/PENDING_EXAM）'),
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
        task_type = request.query_params.get('task_type')
        if task_type:
            queryset = queryset.filter(task__task_type=task_type)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Check and update overdue status for each assignment
        # Property 23: 任务逾期状态标记
        now = timezone.now()
        for assignment in queryset:
            if assignment.status not in ['COMPLETED', 'OVERDUE'] and assignment.task.deadline < now:
                assignment.mark_overdue()
        
        queryset = queryset.order_by('-task__created_at')
        serializer = StudentAssignmentListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentLearningTaskDetailView(APIView):
    """
    Student's learning task detail endpoint.
    
    Returns detailed information about a learning task assignment including
    knowledge items and their learning progress.
    
    Requirements:
    - 8.1: 学员查看学习任务详情时展示任务标题、介绍、分配人、截止时间、整体进度和知识文档列表
    - 8.2: 学员进入未完成的知识子任务时展示知识内容和「我已学习掌握」按钮
    - 8.4: 学员查看已完成的知识子任务时展示知识内容（只读）和完成时间
    
    Properties:
    - Property 23: 任务逾期状态标记
    """
    permission_classes = [IsAuthenticated]
    
    def get_assignment(self, task_id, user):
        """Get task assignment for the user."""
        try:
            assignment = TaskAssignment.objects.select_related(
                'task', 'task__created_by'
            ).prefetch_related(
                'task__task_knowledge__knowledge',
                'knowledge_progress__task_knowledge__knowledge'
            ).get(
                task_id=task_id,
                assignee=user,
                task__is_deleted=False
            )
            
            # Check and update overdue status
            # Property 23: 任务逾期状态标记
            assignment.check_and_update_overdue()
            
            return assignment
        except TaskAssignment.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在或未分配给您'
            )
    
    @extend_schema(
        summary='获取学习任务详情',
        description='''
        获取学员的学习任务详情，包括：
        - 任务基本信息（标题、介绍、分配人、截止时间）
        - 整体进度
        - 知识文档列表及学习状态
        
        Requirements: 8.1, 8.2, 8.4
        ''',
        responses={
            200: StudentLearningTaskDetailSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['学员任务执行']
    )
    def get(self, request, task_id):
        assignment = self.get_assignment(task_id, request.user)
        
        # Verify it's a learning task
        if assignment.task.task_type != 'LEARNING':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此接口仅支持学习任务'
            )
        
        # Ensure knowledge progress records exist for all task knowledge items
        self._ensure_knowledge_progress(assignment)
        
        serializer = StudentLearningTaskDetailSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def _ensure_knowledge_progress(self, assignment):
        """
        Ensure KnowledgeLearningProgress records exist for all task knowledge items.
        
        This creates progress records lazily when the student first views the task.
        """
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
    """
    Complete knowledge learning endpoint.
    
    Marks a knowledge item as learned within a learning task.
    
    Requirements:
    - 8.3: 学员点击「我已学习掌握」时记录完成状态和完成时间
    - 8.5: 所有知识子任务完成时将学习任务状态变为「已完成」
    
    Properties:
    - Property 20: 知识学习完成记录
    - Property 21: 学习任务自动完成
    """
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
        - 当所有知识都完成时，自动将任务状态设为已完成
        
        Requirements: 8.3, 8.5
        Properties: 20, 21
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
        
        # Verify it's a learning task
        if assignment.task.task_type != 'LEARNING':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此接口仅支持学习任务'
            )
        
        # Check and update overdue status first
        # Property 23: 任务逾期状态标记
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
        # Property 20: 知识学习完成记录
        # Property 21: 学习任务自动完成 (handled in mark_completed method)
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
