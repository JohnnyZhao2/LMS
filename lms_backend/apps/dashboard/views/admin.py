"""
Admin dashboard views.
Implements:
- Admin dashboard API
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.dashboard.services import MentorDashboardService
from core.base_view import BaseAPIView
from core.responses import success_response


class AdminDashboardView(BaseAPIView):
    """
    管理员仪表盘 API 端点
    GET /api/dashboard/admin/
    """
    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService

    @extend_schema(
        summary='获取管理员仪表盘数据',
        description='获取管理员系统概览数据',
        responses={
            200: OpenApiResponse(description='仪表盘数据'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['管理员仪表盘']
    )
    def get(self, request):
        enforce(
            'dashboard.admin.view',
            request,
            error_message='只有管理员或超管可以访问此仪表盘',
        )
        data = self.service.get_dashboard_data()
        return success_response(data)
