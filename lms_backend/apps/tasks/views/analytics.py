"""
Task analytics views for admin preview.
Implements:
- Task analytics API
- Student executions API
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import get_engine
from apps.tasks.analytics_selectors import (
    task_analytics_payload,
    task_student_executions,
)
from apps.tasks.analytics_serializers import StudentExecutionSerializer, TaskAnalyticsSerializer
from apps.tasks.selectors import get_task_for_access
from apps.tasks.task_service import TaskService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_int_query_param
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
        task = self.service.validate_not_none(
            get_task_for_access(pk),
            f'任务 {pk} 不存在',
        )
        engine = get_engine(request)
        engine.enforce(
            'tasks.view_task_analytics',
            resource=task,
            error_message='无权查看任务分析',
        )

        analytics = task_analytics_payload(task.id, deadline=task.deadline)
        serializer = TaskAnalyticsSerializer(analytics)
        return success_response(serializer.data)


class StudentExecutionsView(BaseAPIView):
    """Student executions endpoint for admin preview."""
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    @extend_schema(
        summary='获取学员执行情况',
        description='获取任务指定节点下所有学员的执行情况列表',
        parameters=[
            OpenApiParameter(name='node_type', type=str, required=False, description='节点类型：KNOWLEDGE / PRACTICE / EXAM'),
            OpenApiParameter(name='node_id', type=int, required=False, description='节点ID（TaskKnowledge.id 或 TaskQuiz.id）'),
        ],
        responses={
            200: StudentExecutionSerializer(many=True),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或节点不存在'),
        },
        tags=['任务分析']
    )
    def get(self, request, pk):
        task = self.service.validate_not_none(
            get_task_for_access(pk),
            f'任务 {pk} 不存在',
        )
        engine = get_engine(request)
        engine.enforce(
            'tasks.view_task_analytics',
            resource=task,
            error_message='无权查看学员执行情况',
        )

        node_type = request.query_params.get('node_type') or None
        node_id = parse_int_query_param(request, name='node_id', minimum=1)

        if (node_type is None) != (node_id is None):
            raise BusinessError(ErrorCodes.INVALID_INPUT, 'node_type 和 node_id 必须同时提供或同时省略')

        executions = task_student_executions(
            task.id,
            deadline=task.deadline,
            node_type=node_type,
            node_id=node_id,
        )
        serializer = StudentExecutionSerializer(executions, many=True)
        return list_response(serializer.data)
