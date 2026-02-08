"""
Mentor/Department Manager dashboard views.
Implements:
- Mentor/Department manager dashboard API
- Students needing attention API
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.dashboard.services import MentorDashboardService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_int_query_param
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
        current_role = self.service.get_current_role()
        if current_role not in ['MENTOR', 'DEPT_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有导师、室经理或管理员可以访问此仪表盘'
            )
        # 调用 Service 获取仪表盘数据
        data = self.service.get_dashboard_data()
        return success_response(data)


class StudentsNeedingAttentionView(BaseAPIView):
    """
    需要关注的学员 API 端点
    GET /api/dashboard/mentor/students-needing-attention/
    """
    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService

    @extend_schema(
        summary='获取需要关注的学员',
        description='获取有预警的学员列表，包括逾期任务、考试不及格、长期不活跃等',
        responses={
            200: OpenApiResponse(description='需要关注的学员列表'),
            403: OpenApiResponse(description='无权限访问')
        },
        tags=['导师/室经理仪表盘']
    )
    def get(self, request):
        current_role = self.service.get_current_role()
        if current_role not in ['MENTOR', 'DEPT_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有导师、室经理或管理员可以访问此接口'
            )
        limit = parse_int_query_param(
            request=request,
            name='limit',
            default=10,
            minimum=1,
            maximum=100,
        )
        data = self.service.get_students_needing_attention(limit=limit)
        return success_response(data)
