"""
Views for practice submission management.
Implements practice result endpoint.
Properties:
- Property 30: 客观题自动评分
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response

from ..serializers import PracticeResultSerializer
from ..services import SubmissionService
from .common import enforce_student_submission_role


class PracticeResultView(BaseAPIView):
    """
    View practice result.
    """
    permission_classes = [IsAuthenticated]
    service_class = SubmissionService
    @extend_schema(
        summary='查看测验结果',
        description='''
        查看测验结果，包括答案和解析。
        ''',
        responses={
            200: PracticeResultSerializer,
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['测验答题']
    )
    def get(self, request, pk):
        enforce_student_submission_role(request)
        submission = self.service.get_submission_by_id(pk, user=request.user)
        # Check submission is completed
        if submission.status == 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='答卷尚未提交'
            )
        response_serializer = PracticeResultSerializer(submission)
        return success_response(response_serializer.data)
