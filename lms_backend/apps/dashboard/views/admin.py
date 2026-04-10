"""
Admin dashboard views.
Implements:
- Admin dashboard API
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema

from .base import MentorScopedDashboardView


class AdminDashboardView(MentorScopedDashboardView):
    """
    管理员仪表盘 API 端点
    GET /api/dashboard/admin/
    """
    permission_code = 'dashboard.admin.view'
    permission_error_message = '只有管理员或超管可以访问此仪表盘'

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
        return super().get(request)
