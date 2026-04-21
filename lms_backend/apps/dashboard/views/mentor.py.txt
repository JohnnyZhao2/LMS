"""
Mentor/Department Manager dashboard views.
Implements:
- Mentor/Department manager dashboard API
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view

from .base import MentorScopedDashboardView


@extend_schema_view(
    get=extend_schema(
        summary='获取导师/室经理仪表盘数据',
        description='获取导师或室经理的仪表盘数据，包括所辖学员的完成率和平均分',
        responses={
            200: OpenApiResponse(description='仪表盘数据'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['导师/室经理仪表盘']
    )
)
class MentorDashboardView(MentorScopedDashboardView):
    """
    导师/室经理仪表盘 API 端点
    GET /api/dashboard/mentor/
    """
    permission_code = 'dashboard.mentor.view'
    permission_error_message = '只有导师、室经理或超管可以访问此仪表盘'
