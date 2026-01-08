"""
Mentor/Department Manager dashboard views.
Implements:
- Mentor/Department manager dashboard API
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from core.exceptions import BusinessError, ErrorCodes
from apps.users.permissions import get_current_role
from apps.dashboard.services import MentorDashboardService
class MentorDashboardView(APIView):
    """
    导师/室经理仪表盘 API 端点
    GET /api/dashboard/mentor/
    """
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = MentorDashboardService()
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
        user = request.user
        current_role = get_current_role(user)
        if current_role not in ['MENTOR', 'DEPT_MANAGER', 'ADMIN']:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有导师、室经理或管理员可以访问此仪表盘'
            )
        # 调用 Service 获取仪表盘数据
        data = self.service.get_dashboard_data(user)
        return Response(data)
