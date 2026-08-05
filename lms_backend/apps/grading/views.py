from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.grading.serializers import (
    GradingAnswerResponseSerializer,
    GradingQuestionSerializer,
    GradingSubmitSerializer,
    PendingTaskSerializer,
)
from apps.grading.services import GradingService
from core.base_view import BaseAPIView
from core.query_params import parse_int_query_param
from core.responses import list_response, success_response


class GradingQuestionsView(BaseAPIView):
    """阅卷中心题目列表。"""

    permission_classes = [IsAuthenticated]
    service_class = GradingService

    @extend_schema(
        summary='获取阅卷中心题目列表',
        description='获取任务中全部题目及通过率信息',
        responses={
            200: GradingQuestionSerializer(many=True),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['阅卷中心'],
    )
    def get(self, request, task_id):
        quiz_id = parse_int_query_param(request, name='quiz_id', required=True, minimum=1)
        questions = self.service.list_questions(task_id, quiz_id)
        serializer = GradingQuestionSerializer(questions, many=True)
        return list_response(serializer.data)


class GradingAnswersView(BaseAPIView):
    """阅卷中心题目分析详情。"""

    permission_classes = [IsAuthenticated]
    service_class = GradingService

    @extend_schema(
        summary='获取题目分析详情',
        description='获取指定题目的作答分布与学员答案',
        parameters=[
            OpenApiParameter(name='question_id', type=int, required=True, description='题目ID'),
        ],
        responses={
            200: GradingAnswerResponseSerializer,
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['阅卷中心'],
    )
    def get(self, request, task_id):
        question_id = parse_int_query_param(request, name='question_id', required=True, minimum=1)
        quiz_id = parse_int_query_param(request, name='quiz_id', required=True, minimum=1)
        answers = self.service.get_question_analysis(task_id, quiz_id, question_id)
        serializer = GradingAnswerResponseSerializer(answers)
        return success_response(serializer.data)


class GradingSubmitView(BaseAPIView):
    """提交主观题评分。"""

    permission_classes = [IsAuthenticated]
    service_class = GradingService

    @extend_schema(
        summary='提交评分',
        description='为学员的简答题答案提交评分',
        request=GradingSubmitSerializer,
        responses={
            200: OpenApiResponse(description='评分成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或答案不存在'),
        },
        tags=['阅卷中心'],
    )
    def post(self, request, task_id):
        serializer = GradingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.service.grade_answer(
            task_id,
            quiz_id=data['quiz_id'],
            question_id=data['question_id'],
            student_id=data['student_id'],
            score=data['score'],
            comments=data.get('comments', ''),
        )
        return success_response({'message': '评分成功'})


class PendingQuizzesView(BaseAPIView):
    """当前用户可在阅卷中心查看的任务和试卷列表。"""

    permission_classes = [IsAuthenticated]
    service_class = GradingService

    @extend_schema(
        summary='获取阅卷中心任务列表',
        description='获取当前用户可在阅卷中心查看的任务与试卷列表，支持按试卷类型筛选',
        parameters=[
            OpenApiParameter(
                name='quiz_type',
                type=str,
                required=False,
                description='试卷类型筛选: EXAM(考试) / PRACTICE(测验)',
            ),
        ],
        responses={
            200: PendingTaskSerializer(many=True),
        },
        tags=['阅卷中心'],
    )
    def get(self, request):
        quiz_type = request.query_params.get('quiz_type')
        results = self.service.list_grading_tasks(quiz_type=quiz_type)
        serializer = PendingTaskSerializer(results, many=True)
        return list_response(serializer.data)
