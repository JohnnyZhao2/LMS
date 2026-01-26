"""
Views for practice submission management.
Implements practice result endpoint.
Properties:
- Property 30: 客观题自动评分
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from ..services import SubmissionService
from ..serializers import PracticeResultSerializer
class PracticeResultView(BaseAPIView):
    """
    View practice result.
    """
    permission_classes = [IsAuthenticated]
    service_class = SubmissionService
    @extend_schema(
        summary='查看练习结果',
        description='''
        查看练习结果，包括答案和解析。
        ''',
        responses={
            200: PracticeResultSerializer,
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['练习答题']
    )
    def get(self, request, pk):
        submission = self.service.get_submission_by_id(pk, user=request.user)
        # Check submission is completed
        if submission.status == 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='答卷尚未提交'
            )
        response_serializer = PracticeResultSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
