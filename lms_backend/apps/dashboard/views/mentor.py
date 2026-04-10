"""
Mentor/Department Manager dashboard views.
Implements:
- Mentor/Department manager dashboard API
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.dashboard.services import MentorDashboardService
from core.base_view import BaseAPIView
from core.responses import success_response


class MentorDashboardView(BaseAPIView):
    """
    导师/室经理仪表盘 API 端点
    GET /api/dashboard/mentor/
    """
    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService

    @extend_schema(
        summary='获取导师/室经理仪表盘数据',
        description='获取导师或室经理的仪表盘数据，包括所辖学员的完成率和平均分',
        responses={
            200: OpenApiResponse(description='仪表盘数据'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['导师/室经理仪表盘']
    )
    def get(self, request):
        enforce(
            'dashboard.mentor.view',
            request,
            error_message='只有导师、室经理或超管可以访问此仪表盘',
        )
        data = self.service.get_dashboard_data()
        return success_response(data)
