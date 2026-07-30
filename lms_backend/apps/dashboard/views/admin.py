"""
全局仪表盘视图。
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view

from apps.authorization.roles import GLOBAL_ROLE, SUPER_ADMIN_ROLE
from apps.dashboard.services import AdminDashboardService

from .base import RoleScopedDashboardView


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
    """
    全局仪表盘
    GET /api/dashboard/admin/
    """

    allowed_roles = (GLOBAL_ROLE, SUPER_ADMIN_ROLE)
    role_error_message = '只有全局角色或超管可以访问此仪表盘'
    service_class = AdminDashboardService
