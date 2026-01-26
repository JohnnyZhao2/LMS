from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from rest_framework.permissions import IsAuthenticated

from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import success_response, list_response
from apps.users.permissions import IsAdminOrMentorOrDeptManager
from apps.tasks.services import TaskService
from apps.questions.models import Question
from apps.grading.serializers import (
    GradingQuestionSerializer,
    GradingAnswerResponseSerializer,
    GradingSubmitSerializer,
)
from apps.grading.selectors import get_latest_answers, calculate_question_pass_rate


class GradingBaseView(BaseAPIView):
    permission_classes = [IsAuthenticated, IsAdminOrMentorOrDeptManager]
    service_class = TaskService

    def _get_task(self, task_id):
        task = self.service.get_task_by_id(task_id)
        self.service.check_task_read_permission(task)
        return task

    def _get_int_query_param(self, request, name):
        value = request.query_params.get(name)
        if value is None:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'缺少 {name} 参数'
            )
        try:
            return int(value)
        except (TypeError, ValueError):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'{name} 参数必须为整数'
            )

    def _validate_quiz_in_task(self, task, quiz_id):
        if not task.task_quizzes.filter(quiz_id=quiz_id).exists():
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='试卷不属于该任务'
            )


class GradingQuestionsView(GradingBaseView):
    """Grading questions endpoint."""

    @extend_schema(
        summary='获取阅卷中心题目列表',
        description='获取任务中全部题目及通过率信息',
        responses={
            200: GradingQuestionSerializer(many=True),
            404: OpenApiResponse(description='任务不存在'),
        },
        tags=['阅卷中心']
    )
    def get(self, request, task_id):
        task = self._get_task(task_id)

        quiz_id = self._get_int_query_param(request, 'quiz_id')
        self._validate_quiz_in_task(task, quiz_id)

        questions = self._get_grading_questions(task, quiz_id)
        serializer = GradingQuestionSerializer(questions, many=True)
        return list_response(serializer.data)

    def _get_grading_questions(self, task, quiz_id):
        """获取阅卷中心题目列表"""
        questions = Question.objects.filter(
            question_quizzes__quiz_id=quiz_id
        ).distinct().order_by('question_quizzes__order')

        results = []
        for question in questions:
            pass_rate = calculate_question_pass_rate(task, question, quiz_id)
            results.append({
                'question_id': question.id,
                'question_text': question.content,
                'question_analysis': question.explanation or '',
                'question_type': question.question_type,
                'question_type_display': question.get_question_type_display(),
                'max_score': float(question.score),
                'pass_rate': pass_rate,
            })

        return results


class GradingAnswersView(GradingBaseView):
    """Grading answers endpoint."""

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
        tags=['阅卷中心']
    )
    def get(self, request, task_id):
        task = self._get_task(task_id)

        question_id = self._get_int_query_param(request, 'question_id')
        quiz_id = self._get_int_query_param(request, 'quiz_id')
        self._validate_quiz_in_task(task, quiz_id)

        answers = self._get_grading_answers(task, question_id, quiz_id)
        serializer = GradingAnswerResponseSerializer(answers)
        return success_response(serializer.data)

    def _get_grading_answers(self, task, question_id, quiz_id):
        """获取题目分析详情"""
        question = Question.objects.filter(id=question_id).first()
        if not question:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应题目'
            )
        answers = get_latest_answers(task, question_id, quiz_id).select_related(
            'submission__task_assignment__assignee',
            'submission__task_assignment__assignee__department'
        ).order_by('graded_by', 'submission__submitted_at')

        pass_rate = calculate_question_pass_rate(task, question, quiz_id)

        if question.is_objective:
            return {
                'question_id': question.id,
                'question_type': question.question_type,
                'pass_rate': pass_rate,
                'options': self._build_objective_options(question, answers),
            }

        return {
            'question_id': question.id,
            'question_type': question.question_type,
            'pass_rate': pass_rate,
            'subjective_answers': self._build_subjective_answers(answers),
        }

    def _build_objective_options(self, question, answers):
        """构造客观题选项分布"""
        options = question.options or []
        if question.question_type == 'TRUE_FALSE' and not options:
            options = [
                {'key': 'TRUE', 'value': '正确'},
                {'key': 'FALSE', 'value': '错误'},
            ]

        correct_keys = question.answer if isinstance(question.answer, list) else [question.answer]
        option_payload = []

        for option in options:
            if not isinstance(option, dict):
                continue
            option_key = option.get('key')
            option_text = option.get('value')
            if not option_key:
                continue
            students = []
            selected_count = 0

            for answer in answers:
                user_answer = answer.user_answer
                selected = False
                if question.question_type == 'MULTIPLE_CHOICE':
                    selected = isinstance(user_answer, list) and option_key in user_answer
                else:
                    selected = user_answer == option_key

                if selected:
                    selected_count += 1
                    user = answer.submission.task_assignment.assignee
                    students.append({
                        'student_id': user.id,
                        'student_name': user.username,
                        'employee_id': user.employee_id or '',
                        'department': user.department.name if user.department else '',
                    })

            option_payload.append({
                'option_key': option_key,
                'option_text': option_text,
                'selected_count': selected_count,
                'is_correct': option_key in correct_keys,
                'students': students,
            })

        return option_payload

    def _build_subjective_answers(self, answers):
        """构造主观题答案列表"""
        results = []
        for answer in answers:
            user = answer.submission.task_assignment.assignee
            results.append({
                'student_id': user.id,
                'student_name': user.username,
                'employee_id': user.employee_id or '',
                'department': user.department.name if user.department else '',
                'answer_text': answer.user_answer if isinstance(answer.user_answer, str) else str(answer.user_answer or ''),
                'submitted_at': answer.submission.submitted_at,
                'score': float(answer.obtained_score) if answer.graded_by else None,
            })

        return results


class GradingSubmitView(GradingBaseView):
    """Grading submit endpoint."""

    @extend_schema(
        summary='提交评分',
        description='为学员的简答题答案提交评分',
        request=GradingSubmitSerializer,
        responses={
            200: OpenApiResponse(description='评分成功'),
            400: OpenApiResponse(description='参数错误'),
            404: OpenApiResponse(description='任务或答案不存在'),
        },
        tags=['阅卷中心']
    )
    def post(self, request, task_id):
        task = self._get_task(task_id)

        serializer = GradingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        self._validate_quiz_in_task(task, data['quiz_id'])
        self._submit_grading(
            task=task,
            quiz_id=data['quiz_id'],
            question_id=data['question_id'],
            student_id=data['student_id'],
            score=data['score'],
            comments=data['comments']
        )

        return success_response({'message': '评分成功'})

    def _submit_grading(self, task, quiz_id, question_id, student_id, score, comments):
        """提交评分"""
        grader = self.request.user
        answer = get_latest_answers(task, question_id, quiz_id).filter(
            submission__task_assignment__assignee_id=student_id,
            submission__status__in=['GRADING', 'SUBMITTED', 'GRADED']
        ).order_by('-submission__submitted_at', '-submission_id').first()
        if not answer:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应的答案记录'
            )

        if score < 0 or score > float(answer.question.score):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'分数必须在 0 到 {answer.question.score} 之间'
            )

        answer.grade(grader=grader, score=score, comment=comments)
