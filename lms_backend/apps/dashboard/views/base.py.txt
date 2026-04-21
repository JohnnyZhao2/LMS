from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.dashboard.services import MentorDashboardService
from core.base_view import BaseAPIView
from core.responses import success_response


class MentorScopedDashboardView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = MentorDashboardService
    permission_code = ''
    permission_error_message = ''

    def get(self, request):
        enforce(
            self.permission_code,
            request,
            error_message=self.permission_error_message,
        )
        data = self.service.get_dashboard_data()
        return success_response(data)
