"""
Mentor/Department Manager dashboard views.
Implements:
- Mentor/Department manager dashboard API
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view

from .base import MENTOR_DASHBOARD_ROLES, MentorScopedDashboardView


@extend_schema_view(
    get=extend_schema(
        summary='获取导师/室经理仪表盘数据',
        description='获取导师或室经理的仪表盘摘要数据（学员数量、任务完成率、平均分等）',
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
    allowed_roles = MENTOR_DASHBOARD_ROLES
    permission_error_message = '只有导师、室经理或超管可以访问此仪表盘'
