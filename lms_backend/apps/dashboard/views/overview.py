"""管理端仪表盘：全局 / 导师·室组。"""

from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view
from rest_framework.permissions import IsAuthenticated

from apps.authorization.roles import (
    DEPT_ROLE,
    GLOBAL_ROLE,
    MENTOR_ROLE,
    SUPER_ADMIN_ROLE,
    enforce_current_roles,
)
from apps.dashboard.services import AdminDashboardService, MentorDashboardService
from core.base_view import BaseAPIView
from core.responses import success_response


class RoleScopedDashboardView(BaseAPIView):
    """仪表盘按当前角色门禁，不走授权权限点。"""

    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService
    allowed_roles: tuple[str, ...] = ()
    role_error_message = ''

    def get(self, request):
        enforce_current_roles(
            request,
            self.allowed_roles,
            error_message=self.role_error_message,
        )
        data = self.service.get_dashboard_data()
        return success_response(data)


@extend_schema_view(
    get=extend_schema(
        summary='获取全局仪表盘数据',
        description='获取全局角色系统概览数据',
        responses={
            200: OpenApiResponse(description='仪表盘数据'),
            403: OpenApiResponse(description='无权限访问'),
        },
        tags=['全局仪表盘'],
    )
)
class AdminDashboardView(RoleScopedDashboardView):
    """GET /api/dashboard/admin/"""

    allowed_roles = (GLOBAL_ROLE, SUPER_ADMIN_ROLE)
    role_error_message = '只有全局角色或超管可以访问此仪表盘'
    service_class = AdminDashboardService


@extend_schema_view(
    get=extend_schema(
        summary='获取导师/室组仪表盘数据',
        description='获取导师或室组角色的仪表盘摘要数据',
        responses={
            200: OpenApiResponse(description='仪表盘数据'),
            403: OpenApiResponse(description='无权限访问'),
        },
        tags=['导师/室组仪表盘'],
    )
)
class MentorDashboardView(RoleScopedDashboardView):
    """GET /api/dashboard/mentor/"""

    allowed_roles = (MENTOR_ROLE, DEPT_ROLE, SUPER_ADMIN_ROLE)
    role_error_message = '只有导师、室组或超管可以访问此仪表盘'
