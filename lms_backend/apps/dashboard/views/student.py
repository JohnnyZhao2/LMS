"""
Student dashboard views.
Implements:
- Student dashboard API
"""
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.dashboard.serializers import (
    StudentDashboardSerializer,
    StudentPendingTaskSerializer,
)
from apps.dashboard.services import StudentDashboardService
from apps.knowledge.serializers import KnowledgeListSerializer
from core.base_view import BaseAPIView


class StudentDashboardView(BaseAPIView):
    """
    学员仪表盘 API 端点
    GET /api/dashboard/student/
    """
    permission_classes = [IsAuthenticated]
    service_class = StudentDashboardService
    @extend_schema(
        summary='获取学员仪表盘数据',
        description='获取学员仪表盘数据，包括待办任务、最新知识和任务统计',
        parameters=[
            OpenApiParameter(name='pending_limit', type=int, description='待办任务数量限制（默认10）'),
            OpenApiParameter(name='knowledge_limit', type=int, description='最新知识数量限制（默认6）'),
        ],
        responses={200: StudentDashboardSerializer},
        tags=['学员仪表盘']
    )
    def get(self, request):
        user = request.user
        pending_limit = int(request.query_params.get('pending_limit', 10))
        knowledge_limit = int(request.query_params.get('knowledge_limit', 6))
        # 调用 Service
        pending_tasks = self.service.get_pending_tasks(user, pending_limit)
        latest_knowledge = self.service.get_latest_knowledge(knowledge_limit)
        task_summary = self.service.get_task_summary(user)
        pending_tasks_data = StudentPendingTaskSerializer(pending_tasks, many=True).data
        latest_knowledge_data = KnowledgeListSerializer(latest_knowledge, many=True).data
        return Response({
            'pending_tasks': pending_tasks_data,
            'latest_knowledge': latest_knowledge_data,
            'task_summary': task_summary
        })
