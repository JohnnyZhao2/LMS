from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.grading.selectors import (
    calculate_question_pass_rate,
    get_latest_quiz_answers,
    has_answer_content,
)
from apps.authorization.engine import enforce, scope_filter
from apps.grading.serializers import (
    GradingAnswerResponseSerializer,
    GradingQuestionSerializer,
    GradingSubmitSerializer,
    PendingTaskSerializer,
)
from apps.tasks.models import Task, TaskQuiz
from apps.tasks.task_service import TaskService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_int_query_param
from core.responses import list_response, success_response


class GradingBaseView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    def _get_task(self, task_id, permission_code: str, error_message: str):
        task = self.service.get_task_by_id(task_id)
        enforce(
            permission_code,
            self.request,
            resource=task,
            error_message=error_message,
        )
        return task

    def _validate_quiz_in_task(self, task, quiz_id):
        if not task.task_quizzes.filter(id=quiz_id).exists():
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
        task = self._get_task(task_id, 'grading.view', '无权访问阅卷中心')

        quiz_id = parse_int_query_param(request, name='quiz_id', required=True, minimum=1)
        self._validate_quiz_in_task(task, quiz_id)

        questions = self._get_grading_questions(task, quiz_id)
        serializer = GradingQuestionSerializer(questions, many=True)
        return list_response(serializer.data)

    def _get_grading_questions(self, task, quiz_id):
        """获取阅卷中心题目列表"""
        task_quiz = TaskQuiz.objects.select_related('quiz').filter(
            id=quiz_id,
            task=task,
        ).first()
        if not task_quiz:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不属于该任务',
            )
        relations = task_quiz.quiz.quiz_questions.prefetch_related('question_options').order_by('order')

        results = []
        for relation in relations:
            pass_rate = calculate_question_pass_rate(
                task,
                relation.id,
                quiz_id,
                relation.score,
                relation.is_objective,
            )
            results.append({
                'question_id': relation.id,
                'question_text': relation.content,
                'question_analysis': relation.explanation or '',
                'question_type': relation.question_type,
                'question_type_display': relation.get_question_type_display(),
                'max_score': float(relation.score),
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
        task = self._get_task(task_id, 'grading.view', '无权访问阅卷中心')

        question_id = parse_int_query_param(request, name='question_id', required=True, minimum=1)
        quiz_id = parse_int_query_param(request, name='quiz_id', required=True, minimum=1)
        self._validate_quiz_in_task(task, quiz_id)

        answers = self._get_grading_answers(task, question_id, quiz_id)
        serializer = GradingAnswerResponseSerializer(answers)
        return success_response(serializer.data)

    def _get_grading_answers(self, task, question_id, quiz_id):
        """获取题目分析详情"""
        task_quiz = TaskQuiz.objects.select_related('quiz').filter(
            id=quiz_id,
            task=task,
        ).first()
        if not task_quiz:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不属于该任务',
            )
        relation = task_quiz.quiz.quiz_questions.prefetch_related('question_options').filter(
            id=question_id,
        ).first()
        if not relation:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应题目或题目不属于该试卷'
            )
        answers = list(get_latest_quiz_answers(task, quiz_id).filter(question_id=question_id).select_related(
            'submission__task_assignment__assignee',
            'submission__task_assignment__assignee__department'
        ).order_by('graded_by', 'submission__submitted_at')
        )
        answered_count = sum(1 for answer in answers if has_answer_content(answer.user_answer))

        pass_rate = calculate_question_pass_rate(
            task,
            relation.id,
            quiz_id,
            relation.score,
            relation.is_objective,
        )

        if relation.is_objective:
            return {
                'question_id': relation.id,
                'question_type': relation.question_type,
                'pass_rate': pass_rate,
                'answered_count': answered_count,
                'options': self._build_objective_options(relation, answers),
            }

        return {
            'question_id': relation.id,
            'question_type': relation.question_type,
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
                        'avatar_key': user.avatar_key,
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
                'avatar_key': user.avatar_key,
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
        task = self._get_task(task_id, 'grading.score', '无权提交评分')

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
        answer = get_latest_quiz_answers(task, quiz_id).filter(
            question_id=question_id,
            submission__task_assignment__assignee_id=student_id,
            submission__status__in=['GRADING', 'SUBMITTED', 'GRADED']
        ).order_by('-submission__submitted_at', '-submission_id').first()
        if not answer:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应的答案记录'
            )

        if score < 0 or score > float(answer.max_score):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'分数必须在 0 到 {answer.max_score} 之间'
            )

        answer.grade(grader=grader, score=score, comment=comments)


class PendingQuizzesView(GradingBaseView):
    """获取当前用户待阅卷的任务和试卷列表"""

    @extend_schema(
        summary='获取待阅卷任务列表',
        description='获取当前用户创建的所有任务中包含试卷的任务列表，支持按试卷类型筛选',
        parameters=[
            OpenApiParameter(
                name='quiz_type',
                type=str,
                required=False,
                description='试卷类型筛选: EXAM(考试) / PRACTICE(测验)'
            ),
        ],
        responses={
            200: PendingTaskSerializer(many=True),
        },
        tags=['阅卷中心']
    )
    def get(self, request):
        enforce('grading.view', request, error_message='无权访问阅卷中心')
        quiz_type = request.query_params.get('quiz_type')

        tasks = scope_filter(
            'task.view',
            request,
            base_queryset=Task.objects.prefetch_related('task_quizzes__quiz').filter(
                is_deleted=False,
                task_quizzes__isnull=False,
            ),
        ).filter(
            is_deleted=False,
        ).distinct().order_by('-created_at')

        results = []
        for task in tasks:
            task_quizzes = task.task_quizzes.select_related('quiz').all()

            # 按试卷类型筛选
            if quiz_type:
                task_quizzes = [
                    tq for tq in task_quizzes
                    if tq.quiz.quiz_type == quiz_type
                ]

            if not task_quizzes:
                continue

            quizzes_data = []
            for tq in task_quizzes:
                quiz = tq.quiz
                # 统计待批阅数量（主观题未评分的提交）
                pending_count = self._count_pending_grading(task, tq.id)
                if pending_count <= 0:
                    continue

                quizzes_data.append({
                    'quiz_id': tq.id,
                    'quiz_title': quiz.title,
                    'quiz_type': quiz.quiz_type,
                    'quiz_type_display': quiz.get_quiz_type_display(),
                    'question_count': quiz.question_count,
                    'duration': quiz.duration,
                    'pending_count': pending_count,
                })

            if quizzes_data:
                results.append({
                    'task_id': task.id,
                    'task_title': task.title,
                    'deadline': task.deadline,
                    'quizzes': quizzes_data,
                })

        serializer = PendingTaskSerializer(results, many=True)
        return list_response(serializer.data)

    def _count_pending_grading(self, task, quiz_id):
        """统计待批阅的主观题答案数量（仅统计最新提交）"""
        return get_latest_quiz_answers(task, quiz_id).filter(
            submission__status__in=['SUBMITTED', 'GRADING'],
            question__question_type='SHORT_ANSWER',
            graded_by__isnull=True
        ).count()
