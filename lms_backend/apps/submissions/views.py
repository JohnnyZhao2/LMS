"""学员答题接口：开始/恢复、保存答案、提交、查看结果。"""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.roles import enforce_student_workspace
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import created_response, success_response

from .models import Submission
from .serializers import (
    SaveAnswerSerializer,
    StartQuizSerializer,
    SubmissionDetailSerializer,
)
from .services import SubmissionService, UNSET


class StartQuizView(APIView):
    """开始或恢复答题。

    - PRACTICE: 允许多次提交
    - EXAM: 只能提交一次；任务截止后禁止新开卷，已开始可继续作答并提交
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='开始答题',
        description='''
        开始答题。根据试卷类型自动判断行为：
        - PRACTICE: 允许多次提交
        - EXAM: 只能提交一次；参考时间仅用于倒计时提示；任务截止后不可新开卷
        ''',
        request=StartQuizSerializer,
        responses={
            201: SubmissionDetailSerializer,
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或试卷不存在'),
        },
        tags=['答题'],
    )
    def post(self, request):
        enforce_student_workspace(request, error_message='只有学员角色可以进行答题和查看结果')
        serializer = StartQuizSerializer(
            data=request.data,
            context={'request': request},
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
    """提交答卷。

    考试在任务截止后仍允许提交已开始的答卷；参考时间不强制交卷。
    """

    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='提交答卷',
        description='''
        提交答卷：
        - PRACTICE: 可多次提交
        - EXAM: 任务截止后仍可提交已开始的答卷，submitted_at 不超过 deadline；
          参考时间不强制交卷；正确答案在任务截止后才返回
        ''',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['答题'],
    )
    def post(self, request, pk):
        enforce_student_workspace(request, error_message='只有学员角色可以进行答题和查看结果')
        submission = self.service.get_submission_by_id(pk, user=request.user)
        submission = self.service.submit(submission)
        response_serializer = SubmissionDetailSerializer(submission)
        return success_response(response_serializer.data)


class ResultView(BaseAPIView):
    """查看已提交答卷结果。

    练习提交后即可看到正确答案；考试仅在任务截止后返回正确答案与解析。
    """

    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='查看答题结果',
        description='''
        查看已提交答卷的结果。
        - PRACTICE: 提交后返回正确答案与解析
        - EXAM: 任务截止后才返回正确答案与解析
        ''',
        responses={
            200: SubmissionDetailSerializer,
            400: OpenApiResponse(description='答卷尚未提交'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['答题'],
    )
    def get(self, request, pk):
        enforce_student_workspace(request, error_message='只有学员角色可以进行答题和查看结果')
        submission = self.service.get_submission_by_id(pk, user=request.user)
        if submission.status == Submission.STATUS_IN_PROGRESS:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='答卷尚未提交',
            )
        response_serializer = SubmissionDetailSerializer(submission)
        return success_response(response_serializer.data)


class SaveAnswerView(BaseAPIView):
    """答题过程中保存单题答案。"""

    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='保存答案',
        description='保存单个题目的答案，可在答题过程中多次调用。',
        request=SaveAnswerSerializer,
        responses={
            200: OpenApiResponse(description='保存成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['答题'],
    )
    def post(self, request, pk):
        enforce_student_workspace(request, error_message='只有学员角色可以进行答题和查看结果')
        submission = self.service.get_submission_by_id(pk, user=request.user)
        serializer = SaveAnswerSerializer(
            data=request.data,
            context={'request': request, 'submission': submission},
        )
        serializer.is_valid(raise_exception=True)
        answer = self.service.save_answer(
            submission=submission,
            question_id=serializer.validated_data['question_id'],
            user_answer=serializer.validated_data.get('user_answer', UNSET),
            is_marked=serializer.validated_data.get('is_marked', UNSET),
        )
        return success_response(
            data={
                'question_id': answer.question_id,
                'user_answer': answer.user_answer,
                'is_marked': answer.is_marked,
            },
            message='保存成功',
        )
