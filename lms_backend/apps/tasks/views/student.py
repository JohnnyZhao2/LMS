"""
Student task execution views.
Implements:
- Student task list
- Student task detail
- Complete knowledge learning
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from core.exceptions import BusinessError, ErrorCodes
from apps.tasks.models import TaskAssignment, TaskKnowledge, KnowledgeLearningProgress
from apps.tasks.serializers import (
    StudentAssignmentListSerializer,
    StudentTaskDetailSerializer,
    CompleteKnowledgeLearningSerializer,
    KnowledgeLearningProgressSerializer,
)
from apps.tasks.services import StudentTaskService
class StudentAssignmentListView(APIView):
    """Student's task assignment list endpoint."""
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentTaskService()
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
        user = request.user
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        # Use StudentTaskService to get queryset
        queryset = self.service.get_student_assignments_queryset(
            user=user,
            status_filter=status_filter,
            search=search
        )
        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        start = (page - 1) * page_size
        end = start + page_size
        total_count = queryset.count()
        task_list = queryset[start:end]
        serializer = StudentAssignmentListSerializer(task_list, many=True)
        return Response({
            'results': serializer.data,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })
class StudentTaskDetailView(APIView):
    """Student's task detail endpoint."""
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentTaskService()
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
        # Use StudentTaskService to get assignment
        assignment = self.service.get_student_assignment(task_id, request.user)
        # Ensure knowledge progress records exist
        self.service.ensure_knowledge_progress(assignment)
        serializer = StudentTaskDetailSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_200_OK)
class CompleteKnowledgeLearningView(APIView):
    """Complete knowledge learning endpoint."""
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentTaskService()
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
        # Get assignment using service
        assignment = self.service.get_student_assignment(task_id, request.user)
        serializer = CompleteKnowledgeLearningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        knowledge_id = serializer.validated_data['knowledge_id']
        # Use service to complete knowledge learning
        progress = self.service.complete_knowledge_learning(assignment, knowledge_id)
        # Refresh assignment to get updated status
        assignment.refresh_from_db()
        response_serializer = KnowledgeLearningProgressSerializer(progress)
        response_data = response_serializer.data
        response_data['task_status'] = assignment.status
        response_data['task_completed'] = assignment.status == 'COMPLETED'
        return Response(response_data, status=status.HTTP_200_OK)
