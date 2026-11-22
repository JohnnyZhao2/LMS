from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import get_engine
from apps.dashboard.services import MENTOR_DASHBOARD_SCOPE_PERMISSION_CODE, MentorDashboardService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response


class MentorScopedDashboardView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService
    required_permission_code = MENTOR_DASHBOARD_SCOPE_PERMISSION_CODE
    require_full_scope = False
    permission_error_message = '无权访问此仪表盘'

    def get(self, request):
        engine = get_engine(request)
        engine.require_permission(
            self.required_permission_code,
            error_message=self.permission_error_message,
        )
        if self.require_full_scope and not engine.has_full_scope(self.required_permission_code):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message=self.permission_error_message,
            )
        data = self.service.get_dashboard_data()
        return success_response(data)
