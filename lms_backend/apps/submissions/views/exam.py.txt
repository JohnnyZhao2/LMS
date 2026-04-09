"""
Views for exam submission management.
Implements exam result endpoint.
Properties:
- Property 31: 主观题待评分状态
- Property 32: 纯客观题直接完成
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response

from ..serializers import SubmissionDetailSerializer
from ..services import SubmissionService
from .common import enforce_student_submission_role


class ExamResultView(BaseAPIView):
    """
    View exam result.
    """
    permission_classes = [IsAuthenticated]
    service_class = SubmissionService
    @extend_schema(
        summary='查看考试结果',
        description='''
        查看考试结果。
        - 只有已提交的考试才能查看结果
        - 包含答案、得分和解析
        ''',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='考试尚未提交'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['考试答题']
    )
    def get(self, request, pk):
        enforce_student_submission_role(request)
        submission = self.service.get_submission_by_id(pk, user=request.user)
        # Check submission is completed
        if submission.status == 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='考试尚未提交'
            )
        response_serializer = SubmissionDetailSerializer(submission)
        return success_response(response_serializer.data)
