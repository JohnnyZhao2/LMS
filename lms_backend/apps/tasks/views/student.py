"""
Student task execution views.
Implements:
- Student task list
- Student task detail
- Complete knowledge learning
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.tasks.serializers import (
    CompleteKnowledgeLearningSerializer,
    KnowledgeLearningProgressSerializer,
    StudentAssignmentListSerializer,
    StudentTaskDetailSerializer,
)
from apps.tasks.student_task_service import StudentTaskService
from core.base_view import BaseAPIView
from core.pagination import StandardResultsSetPagination
from core.responses import paginated_response, success_response


class StudentAssignmentListView(BaseAPIView):
    """Student's task assignment list endpoint."""
    permission_classes = [IsAuthenticated]
    service_class = StudentTaskService

    @extend_schema(
        summary='获取我的任务列表',
        description='''
        获取当前学员的任务分配列表。
        支持筛选：
        - status: 任务状态（IN_PROGRESS/COMPLETED/OVERDUE）
        ''',
        parameters=[
            OpenApiParameter(name='status', type=str, description='任务状态（IN_PROGRESS/COMPLETED/OVERDUE）'),
            OpenApiParameter(name='search', type=str, description='按任务标题搜索'),
        ],
        responses={200: StudentAssignmentListSerializer(many=True)},
        tags=['学员任务执行']
    )
    def get(self, request):
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        
        # Use StudentTaskService to get queryset (user context injected)
        queryset = self.service.get_student_assignments_queryset(
            status_filter=status_filter,
            search=search
        )

        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = StudentAssignmentListSerializer(page, many=True)
        return paginated_response(page, serializer.data, paginator)


class StudentTaskDetailView(BaseAPIView):
    """Student's task detail endpoint."""
    permission_classes = [IsAuthenticated]
    service_class = StudentTaskService

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
        # Use StudentTaskService to get assignment (user context injected)
        assignment = self.service.get_student_assignment(task_id)
        
        # Ensure knowledge progress records exist
        self.service.ensure_knowledge_progress(assignment)
        
        serializer = StudentTaskDetailSerializer(assignment)
        return success_response(serializer.data)


class CompleteKnowledgeLearningView(BaseAPIView):
    """Complete knowledge learning endpoint."""
    permission_classes = [IsAuthenticated]
    service_class = StudentTaskService

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
        assignment = self.service.get_student_assignment(task_id)
        
        serializer = CompleteKnowledgeLearningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        task_knowledge_id = serializer.validated_data['task_knowledge_id']
        
        # Use service to complete knowledge learning
        progress = self.service.complete_knowledge_learning(assignment, task_knowledge_id)
        
        # Refresh assignment to get updated status
        assignment.refresh_from_db()
        response_serializer = KnowledgeLearningProgressSerializer(progress)
        response_data = response_serializer.data
        response_data['task_status'] = assignment.status
        response_data['task_completed'] = assignment.status == 'COMPLETED'
        
        return success_response(response_data)
