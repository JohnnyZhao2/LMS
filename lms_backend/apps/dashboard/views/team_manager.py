"""
Team Manager dashboard views.
Implements:
- Team manager dashboard API (read-only, team learning data only)
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.dashboard.services import TeamManagerDashboardService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response


class TeamManagerDashboardView(BaseAPIView):
    """
    团队经理仪表盘 API 端点
    GET /api/dashboard/team-manager/
    """
    permission_classes = [IsAuthenticated]
    service_class = TeamManagerDashboardService

    @extend_schema(
        summary='获取团队经理仪表盘数据',
        description='获取团队经理数据看板：学员/导师/知识摘要、一室二室对比、部门学员层级视图',
        responses={
            200: OpenApiResponse(description='仪表盘数据'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['团队经理仪表盘']
    )
    def get(self, request):
        current_role = self.service.get_current_role()
        if current_role != 'TEAM_MANAGER':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有团队经理可以访问此仪表盘'
            )
        data = self.service.get_dashboard_data()
        return success_response(data)
