"""
Common views for submissions.
Implements unified interfaces and common functionality:
- Unified quiz interface (StartQuizView, SubmitView)
- Save answer during quiz
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.engine import enforce
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import created_response, success_response

from ..serializers import (
    SaveAnswerSerializer,
    StartQuizSerializer,
    SubmissionDetailSerializer,
)
from ..services import SubmissionService


def enforce_student_submission_role(request) -> None:
    enforce('submission.answer', request, error_message='只有学员角色可以进行答题和查看结果')


class StartQuizView(APIView):
    """
    统一的开始答题接口，根据 quiz_type 自动判断行为。
    - PRACTICE: 允许多次提交，任务完成后仍可继续
    - EXAM: 只能提交一次，检查时间窗口
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='开始答题',
        description='''
        开始答题。根据试卷类型自动判断行为：
        - PRACTICE: 允许多次提交
        - EXAM: 只能提交一次，有时间限制
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
        enforce_student_submission_role(request)
        serializer = StartQuizSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        response_serializer = SubmissionDetailSerializer(submission)
        # Return 200 if returning existing submission (exam in progress), 201 if new
        if serializer.validated_data.get('in_progress_submission'):
            return success_response(response_serializer.data)
        return created_response(response_serializer.data)


class SubmitView(BaseAPIView):
    """
    统一的提交答卷接口，根据 quiz_type 自动判断行为。
    """
    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='提交答卷',
        description='''
        提交答卷。根据试卷类型自动判断：
        - PRACTICE: 可多次提交
        - EXAM: 自动评分，检查时间
        ''',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['答题']
    )
    def post(self, request, pk):
        enforce_student_submission_role(request)
        submission = self.service.get_submission_by_id(pk, user=request.user)
        submission = self.service.submit(submission)
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
        enforce_student_submission_role(request)
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
        description='''
        保存单个题目的答案。
        可以在答题过程中多次调用此接口保存答案。
        ''',
        request=SaveAnswerSerializer,
        responses={
            200: OpenApiResponse(description='保存成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['测验答题', '考试答题']
    )
    def post(self, request, pk):
        enforce_student_submission_role(request)
        submission = self.service.get_submission_by_id(pk, user=request.user)
        serializer = SaveAnswerSerializer(
            data=request.data,
            context={'request': request, 'submission': submission}
        )
        serializer.is_valid(raise_exception=True)
        answer = serializer.save()
        return success_response(
            data={
                'question_id': answer.question_id,
                'user_answer': answer.user_answer
            },
            message='保存成功'
        )
