"""考试报表 API。"""

from django.http import HttpResponse
from django.utils import timezone
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.authorization.engine import enforce_any
from apps.dashboard.exam_report_service import ExamReportService
from apps.dashboard.serializers import ExamReportExportQuerySerializer, ExamReportQuerySerializer
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes

EXAM_REPORT_PERMISSIONS = (
    'dashboard.mentor.view',
    'dashboard.admin.view',
)


class ExamReportBaseView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = ExamReportService

    def _enforce_access(self):
        enforce_any(
            EXAM_REPORT_PERMISSIONS,
            self.request,
            error_message='无权查看考试报表',
        )

    def _parse_filters(self, serializer_class):
        serializer = serializer_class(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data


class ExamReportView(ExamReportBaseView):
    @extend_schema(
        summary='获取考试报表',
        parameters=[
            OpenApiParameter(name='view', description='视角: detail / student / exam', required=False, type=str),
            OpenApiParameter(name='exam_id', description='考试（TaskQuiz）ID', required=False, type=int),
            OpenApiParameter(name='student_id', description='学员 ID', required=False, type=int),
            OpenApiParameter(name='department_id', description='部门 ID', required=False, type=int),
            OpenApiParameter(name='search', description='搜索学员姓名或工号', required=False, type=str),
            OpenApiParameter(name='page', description='页码（从 1 开始）', required=False, type=int),
            OpenApiParameter(name='page_size', description='每页条数，默认 10', required=False, type=int),
        ],
        responses={200: OpenApiResponse(description='考试报表数据')},
        tags=['考试报表'],
    )
    def get(self, request):
        self._enforce_access()
        filters = self._parse_filters(ExamReportQuerySerializer)
        data = self.service.get_report(filters)
        return Response(data)


class ExamReportExportView(ExamReportBaseView):
    @extend_schema(
        summary='导出考试报表',
        parameters=[
            OpenApiParameter(name='template', description='detail / student_summary / exam_summary', required=True, type=str),
            OpenApiParameter(name='view', description='当前视角（影响默认汇总）', required=False, type=str),
            OpenApiParameter(name='exam_id', required=False, type=int),
            OpenApiParameter(name='student_id', required=False, type=int),
            OpenApiParameter(name='department_id', required=False, type=int),
            OpenApiParameter(name='search', required=False, type=str),
        ],
        responses={200: OpenApiResponse(description='Excel 文件')},
        tags=['考试报表'],
    )
    def get(self, request):
        self._enforce_access()
        filters = self._parse_filters(ExamReportExportQuerySerializer)
        template = filters.pop('template')
        try:
            content = self.service.export_report(filters, template)
        except ValueError as exc:
            raise BusinessError(code=ErrorCodes.INVALID_INPUT, message=str(exc)) from exc

        filename = f"exam_report_{timezone.now().strftime('%Y%m%d%H%M%S')}.xlsx"
        response = HttpResponse(
            content,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
