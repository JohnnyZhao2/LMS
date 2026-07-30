"""
导师/室组仪表盘视图。
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema, extend_schema_view

from apps.authorization.roles import DEPT_ROLE, MENTOR_ROLE, SUPER_ADMIN_ROLE

from .base import RoleScopedDashboardView


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
    """
    导师/室组仪表盘
    GET /api/dashboard/mentor/
    """

    allowed_roles = (MENTOR_ROLE, DEPT_ROLE, SUPER_ADMIN_ROLE)
    role_error_message = '只有导师、室组或超管可以访问此仪表盘'
