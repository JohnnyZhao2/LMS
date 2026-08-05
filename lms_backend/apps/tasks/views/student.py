"""学员任务执行 View。"""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.tasks.services import StudentTaskService
from apps.tasks.student_serializers import (
    CompleteKnowledgeLearningResponseSerializer,
    CompleteKnowledgeLearningSerializer,
    StudentAssignmentListSerializer,
    StudentTaskDetailSerializer,
)
from core.base_view import BaseAPIView
from core.pagination import StandardResultsSetPagination
from core.responses import success_response


class StudentAssignmentListView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = StudentTaskService

    @extend_schema(
        summary='获取我的任务列表',
        parameters=[
            OpenApiParameter(
                name='status',
                type=str,
                description='任务状态（NOT_STARTED/IN_PROGRESS/PENDING_GRADING/COMPLETED/OVERDUE）',
            ),
            OpenApiParameter(name='search', type=str, description='按任务标题搜索'),
        ],
        responses={200: StudentAssignmentListSerializer(many=True)},
        tags=['学员任务执行'],
    )
    def get(self, request):
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')
        queryset = self.service.get_student_assignments_queryset(
            status_filter=status_filter,
            search=search,
        )
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = StudentAssignmentListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class StudentTaskDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = StudentTaskService

    @extend_schema(
        summary='获取任务详情',
        responses={
            200: StudentTaskDetailSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['学员任务执行'],
    )
    def get(self, request, task_id):
        assignment = self.service.get_student_task_detail(task_id)
        serializer = StudentTaskDetailSerializer(assignment)
        return success_response(serializer.data)


class CompleteKnowledgeLearningView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = StudentTaskService

    @extend_schema(
        summary='完成知识学习',
        request=CompleteKnowledgeLearningSerializer,
        responses={
            200: CompleteKnowledgeLearningResponseSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或知识不存在'),
        },
        tags=['学员任务执行'],
    )
    def post(self, request, task_id):
        assignment = self.service.get_student_assignment(task_id)
        serializer = CompleteKnowledgeLearningSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        progress = self.service.complete_knowledge_learning(
            assignment,
            serializer.validated_data['task_knowledge_id'],
        )
        progress.task_status = assignment.status
        progress.task_completed = assignment.status == 'COMPLETED'
        return success_response(
            CompleteKnowledgeLearningResponseSerializer(progress).data
        )
