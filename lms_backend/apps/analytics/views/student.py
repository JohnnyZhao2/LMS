"""
Student analytics views.
Implements:
- Student dashboard API
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from apps.analytics.serializers import (
    StudentPendingTaskSerializer,
    LatestKnowledgeSerializer,
    StudentDashboardSerializer,
)
from apps.analytics.services import StudentDashboardService
class StudentDashboardView(APIView):
    """
    学员仪表盘 API 端点
    GET /api/analytics/dashboard/student/
    """
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = StudentDashboardService()
    @extend_schema(
        summary='获取学员仪表盘数据',
        description='获取学员仪表盘数据，包括待办任务、最新知识和任务统计',
        parameters=[
            OpenApiParameter(name='pending_limit', type=int, description='待办任务数量限制（默认10）'),
            OpenApiParameter(name='knowledge_limit', type=int, description='最新知识数量限制（默认5）'),
        ],
        responses={200: StudentDashboardSerializer},
        tags=['学员仪表盘']
    )
    def get(self, request):
        user = request.user
        pending_limit = int(request.query_params.get('pending_limit', 10))
        knowledge_limit = int(request.query_params.get('knowledge_limit', 5))
        # 调用 Service
        pending_tasks = self.service.get_pending_tasks(user, pending_limit)
        latest_knowledge = self.service.get_latest_knowledge(knowledge_limit)
        task_summary = self.service.get_task_summary(user)
        pending_tasks_data = StudentPendingTaskSerializer(pending_tasks, many=True).data
        latest_knowledge_data = LatestKnowledgeSerializer(latest_knowledge, many=True).data
        return Response({
            'pending_tasks': pending_tasks_data,
            'latest_knowledge': latest_knowledge_data,
            'task_summary': task_summary
        })
