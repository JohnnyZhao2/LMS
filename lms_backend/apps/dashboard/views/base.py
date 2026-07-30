from rest_framework.permissions import IsAuthenticated

from apps.authorization.roles import enforce_current_roles
from apps.dashboard.services import MentorDashboardService
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
