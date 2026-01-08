"""
Views for practice submission management.
Implements practice submission endpoints:
Properties:
- Property 24: 练习允许多次提交
- Property 25: 练习任务自动完成
- Property 26: 已完成练习仍可继续
- Property 30: 客观题自动评分
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse
from core.exceptions import BusinessError, ErrorCodes
from ..services import SubmissionService
from ..serializers import (
    SubmissionDetailSerializer,
    StartPracticeSerializer,
    SubmitPracticeSerializer,
    PracticeResultSerializer,
)
class StartPracticeView(APIView):
    """
    Start a practice session.
    Properties:
    - Property 24: 练习允许多次提交
    - Property 26: 已完成练习仍可继续
    """
    permission_classes = [IsAuthenticated]
    @extend_schema(
        summary='开始练习',
        description='''
        开始一次新的练习。
        - 练习任务可以多次提交（Property 24）
        - 即使任务已完成也可以继续练习（Property 26）
        ''',
        request=StartPracticeSerializer,
        responses={
            201: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或试卷不存在'),
        },
        tags=['练习答题']
    )
    def post(self, request):
        serializer = StartPracticeSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        response_serializer = SubmissionDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
class SubmitPracticeView(APIView):
    """
    Submit a practice session.
    Properties:
    - Property 25: 练习任务自动完成
    - Property 30: 客观题自动评分
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PracticeResultSerializer
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubmissionService()
    @extend_schema(
        summary='提交练习',
        description='''
        提交练习答卷。
        - 客观题自动评分（Property 30）
        - 当所有试卷都至少完成一次时，任务自动完成（Property 25）
        ''',
        responses={
            200: PracticeResultSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['练习答题']
    )
    def post(self, request, pk):
        submission = self.service.get_submission_by_id(pk, user=request.user)
        # Submit the practice
        submission = self.service.submit(submission, is_practice=True)
        response_serializer = PracticeResultSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
class PracticeResultView(APIView):
    """
    View practice result.
    """
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubmissionService()
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
