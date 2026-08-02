"""任务分析 View。"""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce, scope_learning_members
from apps.tasks.analytics import build_student_executions, build_task_analytics
from apps.tasks.analytics_serializers import StudentExecutionSerializer, TaskAnalyticsSerializer
from apps.tasks.services import TaskService
from core.base_view import BaseAPIView
from core.responses import list_response, success_response


class TaskAnalyticsView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取任务分析数据',
        responses={
            200: TaskAnalyticsSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务分析'],
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        enforce(
            'task.analytics.view',
            request,
            resource=task,
            error_message='无权查看任务分析',
        )
        analytics = build_task_analytics(task.id, scope_learning_members(request))
        serializer = TaskAnalyticsSerializer(analytics)
        return success_response(serializer.data)


class StudentExecutionsView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取学员执行情况',
        responses={
            200: StudentExecutionSerializer(many=True),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['任务分析'],
    )
    def get(self, request, pk):
        task = self.service.get_task_by_id(pk)
        enforce(
            'task.analytics.view',
            request,
            resource=task,
            error_message='无权查看学员执行情况',
        )
        executions = build_student_executions(task.id, scope_learning_members(request))
        serializer = StudentExecutionSerializer(executions, many=True)
        return list_response(serializer.data)
