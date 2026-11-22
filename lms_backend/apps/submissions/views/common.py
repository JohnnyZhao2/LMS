"""
Common views for submissions.
Implements unified interfaces and common functionality:
- Unified quiz interface (StartQuizView, SubmitView)
- Save answer during quiz
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import created_response, success_response

from ..serializers import (
    SaveAnswerSerializer,
    StartQuizSerializer,
    SubmissionDetailSerializer,
    SubmitQuizSerializer,
)
from ..services import SubmissionService


class StartQuizView(APIView):
    """
    统一的开始答题接口。不允许重做的试卷只能提交一次。
    - PRACTICE: 允许多次提交，任务完成后仍可继续
    - EXAM: 只能提交一次，展示参考时间倒计时
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='开始答题',
        description='''
        开始答题。根据试卷类型自动判断行为：
        - PRACTICE: 允许多次提交
        - EXAM: 只能提交一次，参考时间仅用于倒计时提示
        ''',
        request=StartQuizSerializer,
        responses={
            201: SubmissionDetailSerializer,
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或试卷不存在'),
        },
        tags=['答题']
    )
    def post(self, request):
        serializer = StartQuizSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        service = SubmissionService(request)
        submission, created = service.start_or_resume_quiz(
            assignment_id=serializer.validated_data['assignment_id'],
            quiz_id=serializer.validated_data['quiz_id'],
            user=request.user,
        )
        response_serializer = SubmissionDetailSerializer(submission)
        if not created:
            return success_response(response_serializer.data)
        return created_response(response_serializer.data)


class SubmitView(BaseAPIView):
    """
    统一的提交答卷接口。
    """
    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='提交答卷',
        description='''
        提交答卷。根据试卷类型自动判断：
        - PRACTICE: 可多次提交
        - EXAM: 自动评分，不会因参考时间超时而强制交卷
        ''',
        request=SubmitQuizSerializer,
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['答题']
    )
    def post(self, request, pk):
        submission = self.service.get_submission_for_write(pk, user=request.user)
        serializer = SubmitQuizSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        submission = self.service.submit(
            submission,
            answers=serializer.validated_data.get('answers'),
        )
        response_serializer = SubmissionDetailSerializer(submission)
        return success_response(response_serializer.data)


class ResultView(BaseAPIView):
    """统一的结果查看接口。"""

    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='查看答题结果',
        description='查看已提交答卷的结果，适用于测验和考试。',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='答卷尚未提交'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['答题']
    )
    def get(self, request, pk):
        submission = self.service.get_submission_by_id(pk, user=request.user)
        if submission.status == 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='答卷尚未提交'
            )
        response_serializer = SubmissionDetailSerializer(submission)
        return success_response(response_serializer.data)


class SaveAnswerView(BaseAPIView):
    """
    Save an answer during practice/exam.
    """
    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='保存答案',
        description='批量保存作答内容或题目标记状态。',
        request=SaveAnswerSerializer,
        responses={
            200: OpenApiResponse(description='保存成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['测验答题', '考试答题']
    )
    def post(self, request, pk):
        submission = self.service.get_submission_for_write(pk, user=request.user)
        serializer = SaveAnswerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        saved = self.service.save_answers(submission, serializer.validated_data['answers'])
        return success_response(
            data={'saved_count': len(saved)},
            message='保存成功',
        )
