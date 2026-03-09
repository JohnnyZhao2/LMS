"""
Student dashboard views.
Implements:
- Student dashboard API
- Task participants progress API
"""
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.dashboard.serializers import (
    PeerRankingSerializer,
    StudentDashboardSerializer,
    StudentStatsSerializer,
    StudentTaskSerializer,
)
from apps.dashboard.services import StudentDashboardService
from apps.knowledge.serializers import KnowledgeListSerializer
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_int_query_param
from core.responses import list_response, success_response


class StudentDashboardView(BaseAPIView):
    """
    学员仪表盘 API 端点
    GET /api/dashboard/student/
    """
    permission_classes = [IsAuthenticated]
    service_class = StudentDashboardService

    @extend_schema(
        summary='获取学员仪表盘数据',
        description='获取学员仪表盘数据，包括统计、任务列表、最新知识',
        parameters=[
            OpenApiParameter(name='task_limit', type=int, description='任务数量限制（默认10）'),
            OpenApiParameter(name='knowledge_limit', type=int, description='最新知识数量限制（默认6）'),
        ],
        responses={200: StudentDashboardSerializer},
        tags=['学员仪表盘']
    )
    def get(self, request):
        current_role = self.service.get_current_role()
        if current_role != 'STUDENT':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有学员可以访问此仪表盘'
            )
        user = request.user
        task_limit = parse_int_query_param(
            request=request,
            name='task_limit',
            default=10,
            minimum=1,
            maximum=100,
        )
        knowledge_limit = parse_int_query_param(
            request=request,
            name='knowledge_limit',
            default=6,
            minimum=1,
            maximum=100,
        )

        data = self.service.get_dashboard_data(
            user=user,
            task_limit=task_limit,
            knowledge_limit=knowledge_limit
        )

        return success_response({
            'stats': StudentStatsSerializer(data['stats']).data,
            'tasks': StudentTaskSerializer(data['tasks'], many=True).data,
            'latest_knowledge': KnowledgeListSerializer(data['latest_knowledge'], many=True).data,
        })


class TaskParticipantsView(BaseAPIView):
    """
    任务参与者进度 API 端点
    GET /api/dashboard/student/task/<task_id>/participants/
    """
    permission_classes = [IsAuthenticated]
    service_class = StudentDashboardService

    @extend_schema(
        summary='获取任务参与者进度',
        description='获取指定任务的所有参与者进度',
        responses={200: PeerRankingSerializer(many=True)},
        tags=['学员仪表盘']
    )
    def get(self, request, task_id: int):
        user = request.user
        participants = self.service.get_task_participants(user, task_id)
        return list_response(PeerRankingSerializer(participants, many=True).data)
