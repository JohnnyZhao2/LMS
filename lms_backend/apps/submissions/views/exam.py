"""
Views for exam submission management.
Implements exam submission endpoints:
Properties:
- Property 28: 考试时间窗口控制
- Property 29: 考试单次提交限制
- Property 30: 客观题自动评分
- Property 31: 主观题待评分状态
- Property 32: 纯客观题直接完成
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
    StartExamSerializer,
    SubmitExamSerializer,
    PracticeResultSerializer,
)
class StartExamView(APIView):
    """
    Start an exam session.
    Properties:
    - Property 28: 考试时间窗口控制
    - Property 29: 考试单次提交限制
    """
    permission_classes = [IsAuthenticated]
    @extend_schema(
        summary='开始考试',
        description='''
        开始考试。
        - 只能在考试时间窗口内进入（Property 28）
        - 每个考试只能提交一次（Property 29）
        - 如果已有进行中的考试，返回该考试记录
        ''',
        request=StartExamSerializer,
        responses={
            201: SubmissionDetailSerializer,
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误或不在考试时间窗口内'),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['考试答题']
    )
    def post(self, request):
        serializer = StartExamSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        response_serializer = SubmissionDetailSerializer(submission)
        # Return 200 if returning existing submission, 201 if new
        if serializer.validated_data.get('in_progress_submission'):
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
class SubmitExamView(APIView):
    """
    Submit an exam.
    Properties:
    - Property 30: 客观题自动评分
    - Property 31: 主观题待评分状态
    - Property 32: 纯客观题直接完成
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubmissionDetailSerializer
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubmissionService()
    @extend_schema(
        summary='提交考试',
        description='''
        提交考试答卷。
        - 客观题自动评分（Property 30）
        - 包含主观题时状态设为"待评分"（Property 31）
        - 纯客观题直接完成（Property 32）
        ''',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['考试答题']
    )
    def post(self, request, pk):
        submission = self.service.get_submission_by_id(pk, user=request.user)
        # Submit the exam (is_practice=False)
        submission = self.service.submit(submission, is_practice=False)
        response_serializer = SubmissionDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
class ExamResultView(APIView):
    """
    View exam result.
    """
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = SubmissionService()
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
        submission = self.service.get_submission_by_id(pk, user=request.user)
        # Check submission is completed
        if submission.status == 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='考试尚未提交'
            )
        response_serializer = SubmissionDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
