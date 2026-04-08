"""
Task analytics views for admin preview.
Implements:
- Task analytics API
- Student executions API
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.tasks.selectors import (
    task_analytics_payload,
    task_student_executions,
)
from apps.tasks.serializers import StudentExecutionSerializer, TaskAnalyticsSerializer
from apps.tasks.task_service import TaskService
from core.base_view import BaseAPIView
from core.responses import list_response, success_response


class TaskAnalyticsView(BaseAPIView):
    """Task analytics endpoint for admin preview."""
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取任务分析数据',
        description='获取任务的完成情况、准确率、异常人数等分析数据',
        responses={
            200: TaskAnalyticsSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务分析']
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        enforce(
            'task.analytics.view',
            request,
            resource=task,
            error_message='无权查看任务分析',
        )

        analytics = task_analytics_payload(task.id)
        serializer = TaskAnalyticsSerializer(analytics)
        return success_response(serializer.data)


class StudentExecutionsView(BaseAPIView):
    """Student executions endpoint for admin preview."""
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取学员执行情况',
        description='获取任务下所有学员的执行情况列表',
        responses={
            200: StudentExecutionSerializer(many=True),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务分析']
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        enforce(
            'task.analytics.view',
            request,
            resource=task,
            error_message='无权查看学员执行情况',
        )

        executions = task_student_executions(task.id)
        serializer = StudentExecutionSerializer(executions, many=True)
        return list_response(serializer.data)
