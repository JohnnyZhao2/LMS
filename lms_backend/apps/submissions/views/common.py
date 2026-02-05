"""
Common views for submissions.
Implements unified interfaces and common functionality:
- Unified quiz interface (StartQuizView, SubmitView)
- Save answer during quiz
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.base_view import BaseAPIView

from ..serializers import (
    SaveAnswerSerializer,
    SaveAnswersSerializer,
    StartQuizSerializer,
    SubmissionDetailSerializer,
)
from ..services import SubmissionService


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
        serializer = StartQuizSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        submission = serializer.save()
        response_serializer = SubmissionDetailSerializer(submission)
        # Return 200 if returning existing submission (exam in progress), 201 if new
        if serializer.validated_data.get('in_progress_submission'):
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
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
        submission = self.service.get_submission_by_id(pk, user=request.user)
        # 根据 quiz_type 判断行为
        is_practice = submission.quiz.quiz_type == 'PRACTICE'
        submission = self.service.submit(submission, is_practice=is_practice)
        response_serializer = SubmissionDetailSerializer(submission)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
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
        tags=['练习答题', '考试答题']
    )
    def post(self, request, pk):
        submission = self.service.get_submission_by_id(pk, user=request.user)
        serializer = SaveAnswerSerializer(
            data=request.data,
            context={'request': request, 'submission': submission}
        )
        serializer.is_valid(raise_exception=True)
        answer = serializer.save()
        return Response({
            'message': '保存成功',
            'question_id': answer.question_id,
            'user_answer': answer.user_answer
        }, status=status.HTTP_200_OK)


class SaveAnswersView(BaseAPIView):
    """
    批量保存答案。
    支持一次保存多道题的答案，减少 API 调用次数。
    """
    permission_classes = [IsAuthenticated]
    service_class = SubmissionService

    @extend_schema(
        summary='批量保存答案',
        description='''
        批量保存多个题目的答案。
        可以在答题过程中调用此接口一次性保存多道题的答案，减少网络请求次数。
        ''',
        request=SaveAnswersSerializer,
        responses={
            200: OpenApiResponse(description='保存成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='答题记录不存在'),
        },
        tags=['练习答题', '考试答题']
    )
    def post(self, request, pk):
        submission = self.service.get_submission_by_id(pk, user=request.user)
        serializer = SaveAnswersSerializer(
            data=request.data,
            context={'request': request, 'submission': submission}
        )
        serializer.is_valid(raise_exception=True)
        updated_answers = serializer.save()
        return Response({
            'message': '保存成功',
            'saved_count': len(updated_answers),
            'answers': [
                {
                    'question_id': answer.question_id,
                    'user_answer': answer.user_answer
                }
                for answer in updated_answers
            ]
        }, status=status.HTTP_200_OK)
