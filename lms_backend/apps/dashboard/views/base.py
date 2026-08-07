from rest_framework.permissions import IsAuthenticated

from apps.authorization.roles import ADMIN_LIKE_ROLES, resolve_current_role
from apps.dashboard.services import MentorDashboardService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response

MENTOR_DASHBOARD_ROLES = frozenset({'MENTOR', 'DEPT_MANAGER'})
EXAM_REPORT_ROLES = frozenset({'MENTOR', 'DEPT_MANAGER', *ADMIN_LIKE_ROLES})


def require_current_role(request, allowed_roles: frozenset[str], error_message: str) -> None:
    current_role = resolve_current_role(request.user)
    if current_role not in allowed_roles:
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=error_message,
        )


class MentorScopedDashboardView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService
    allowed_roles: frozenset[str] = MENTOR_DASHBOARD_ROLES
    permission_error_message = ''

    def get(self, request):
        require_current_role(
            request,
            self.allowed_roles,
            error_message=self.permission_error_message,
        )
        data = self.service.get_dashboard_data()
        return success_response(data)
