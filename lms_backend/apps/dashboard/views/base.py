from rest_framework.permissions import IsAuthenticated

from apps.authorization.roles import get_management_role_code
from apps.dashboard.services import MentorDashboardService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response

MENTOR_DASHBOARD_ROLES = frozenset({'MENTOR', 'DEPT_MANAGER'})
EXAM_REPORT_ROLES = frozenset({'MENTOR', 'DEPT_MANAGER', 'ADMIN'})


def require_management_role(request, allowed_roles: frozenset[str], error_message: str) -> None:
    if request.user.is_superuser:
        if 'ADMIN' in allowed_roles:
            return
        raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message=error_message)
    if get_management_role_code(request.user) not in allowed_roles:
        raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message=error_message)


class MentorScopedDashboardView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService
    allowed_roles: frozenset[str] = MENTOR_DASHBOARD_ROLES
    permission_error_message = ''

    def get(self, request):
        require_management_role(
            request,
            self.allowed_roles,
            error_message=self.permission_error_message,
        )
        data = self.service.get_dashboard_data()
        return success_response(data)
