from django.db.models import Count, Prefetch
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.activity_logs.decorators import log_operation
from apps.activity_logs.text import format_number, format_user_label
from apps.authorization.engine import get_engine
from apps.grading.selectors import (
    OBJECTIVE_ANALYTICS_SUBMISSION_STATUSES,
    REVIEWABLE_SUBMISSION_STATUSES,
    calculate_pass_rate_from_answers,
    calculate_quiz_question_pass_rates,
    get_latest_quiz_answers,
    get_pending_quiz_metrics,
    has_answer_content,
)
from apps.grading.serializers import (
    GradingAnswerResponseSerializer,
    GradingQuestionSerializer,
    GradingSubmitSerializer,
    PendingTaskSerializer,
)
from apps.submissions.models import Answer
from apps.submissions.workflows import grade_subjective_answer
from apps.tasks.models import Task, TaskQuiz
from apps.tasks.selectors import get_task_for_access
from apps.tasks.task_service import TaskService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_int_query_param
from core.responses import list_response, success_response


def _manual_grade_log_description(ctx: dict) -> str:
    answer = ctx['result']
    student = answer.submission.task_assignment.assignee
    return f'{format_user_label(student)}，{ctx["score"]}/{format_number(answer.max_score)} 分'


class GradingBaseView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = TaskService

    def _get_task(
        self,
        task_id,
        permission_code: str,
        error_message: str,
        *,
        include_archived: bool = True,
    ) -> Task:
        task = self.service.validate_not_none(
            get_task_for_access(task_id, include_archived=include_archived),
            f'任务 {task_id} 不存在',
        )
        get_engine(self.request).enforce(
            permission_code,
            resource=task,
            error_message=error_message,
        )
        return task

    @staticmethod
    def _get_task_quiz(task, quiz_id: int) -> TaskQuiz:
        task_quiz = TaskQuiz.objects.filter(id=quiz_id, task=task).first()
        if not task_quiz:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不属于该任务',
            )
        return task_quiz


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
        task = self._get_task(
            task_id,
            'tasks.view_grading',
            '无权访问阅卷中心',
        )

        quiz_id = parse_int_query_param(request, name='quiz_id', required=True, minimum=1)
        questions = self._get_grading_questions(task, quiz_id)
        serializer = GradingQuestionSerializer(questions, many=True)
        return list_response(serializer.data)

    def _get_grading_questions(self, task, quiz_id):
        """获取阅卷中心题目列表"""
        task_quiz = self._get_task_quiz(task, quiz_id)
        relations = list(task_quiz.quiz_questions.prefetch_related('question_options').order_by('order'))
        pass_rates = calculate_quiz_question_pass_rates(quiz_id, relations)

        results = []
        for relation in relations:
            results.append({
                'question_id': relation.id,
                'question_text': relation.content,
                'question_analysis': relation.explanation or '',
                'question_type': relation.question_type,
                'question_type_display': relation.get_question_type_display(),
                'max_score': float(relation.score),
                'pass_rate': pass_rates.get(relation.id),
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
        task = self._get_task(
            task_id,
            'tasks.view_grading',
            '无权访问阅卷中心',
        )

        question_id = parse_int_query_param(request, name='question_id', required=True, minimum=1)
        quiz_id = parse_int_query_param(request, name='quiz_id', required=True, minimum=1)

        answers = self._get_grading_answers(task, question_id, quiz_id)
        serializer = GradingAnswerResponseSerializer(answers)
        return success_response(serializer.data)

    def _get_grading_answers(self, task, question_id, quiz_id):
        """获取题目分析详情"""
        task_quiz = self._get_task_quiz(task, quiz_id)
        relation = task_quiz.quiz_questions.prefetch_related('question_options').filter(
            id=question_id,
        ).first()
        if not relation:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应题目或题目不属于该试卷'
            )
        answer_statuses = (
            OBJECTIVE_ANALYTICS_SUBMISSION_STATUSES
            if relation.is_objective
            else REVIEWABLE_SUBMISSION_STATUSES
        )
        answers = list(
            get_latest_quiz_answers(
                quiz_id,
                submission_statuses=answer_statuses,
            ).filter(question_id=question_id).select_related(
                'submission__task_assignment__assignee',
                'submission__task_assignment__assignee__department'
            ).order_by('graded_by', 'submission__submitted_at')
        )
        answer_pairs = [(answer, answer.user_answer) for answer in answers]
        answered_count = sum(1 for _, user_answer in answer_pairs if has_answer_content(user_answer))
        pass_rate = calculate_pass_rate_from_answers(answer_pairs, relation.score, relation.is_objective)

        if relation.is_objective:
            return {
                'question_id': relation.id,
                'question_type': relation.question_type,
                'pass_rate': pass_rate,
                'answered_count': answered_count,
                'options': self._build_objective_options(relation, answer_pairs),
            }

        return {
            'question_id': relation.id,
            'question_type': relation.question_type,
            'pass_rate': pass_rate,
            'subjective_answers': self._build_subjective_answers(answer_pairs),
        }

    def _build_objective_options(self, question, answer_pairs):
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

            for answer, user_answer in answer_pairs:
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

    def _build_subjective_answers(self, answer_pairs):
        """构造主观题答案列表"""
        results = []
        for answer, user_answer in answer_pairs:
            user = answer.submission.task_assignment.assignee
            results.append({
                'answer_id': answer.id,
                'student_id': user.id,
                'student_name': user.username,
                'avatar_key': user.avatar_key,
                'employee_id': user.employee_id or '',
                'department': user.department.name if user.department else '',
                'answer_text': user_answer if isinstance(user_answer, str) else str(user_answer or ''),
                'submitted_at': answer.submission.submitted_at,
                'score': float(answer.obtained_score) if answer.graded_by_id else None,
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
        task = self._get_task(
            task_id,
            'tasks.score_grading',
            '无权提交评分',
            include_archived=False,
        )

        serializer = GradingSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        self._get_task_quiz(task, data['quiz_id'])
        self._submit_grading(
            task=task,
            quiz_id=data['quiz_id'],
            answer_id=data['answer_id'],
            score=data['score'],
            comments=data['comments'],
        )

        return success_response({'message': '评分成功'})

    @log_operation(
        'grading',
        'manual_grade',
        _manual_grade_log_description,
        target_type='quiz',
        target_title_template='{result.submission.task_quiz.title}',
        group='阅卷中心',
        label='提交评分',
    )
    def _submit_grading(self, task, quiz_id, answer_id, score, comments):
        """提交评分"""
        grader = self.request.user
        answer = Answer.objects.select_related(
            'question',
            'submission__task_assignment__assignee',
        ).filter(
            pk=answer_id,
            submission__task_quiz_id=quiz_id,
            submission__task_assignment__task=task,
            submission__status__in=['GRADING', 'SUBMITTED', 'GRADED'],
        ).first()
        if not answer:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应的答案记录'
            )

        return grade_subjective_answer(answer, grader=grader, score=score, comment=comments)


class PendingQuizzesView(GradingBaseView):
    """获取当前用户可在阅卷中心查看的任务和试卷列表"""

    @extend_schema(
        summary='获取阅卷中心任务列表',
        description='获取当前用户可在阅卷中心查看的任务与试卷列表',
        responses={
            200: PendingTaskSerializer(many=True),
        },
        tags=['阅卷中心']
    )
    def get(self, request):
        engine = get_engine(request)
        engine.require_permission('tasks.view_grading', error_message='无权访问阅卷中心')

        base_tasks = engine.scope_filter(
            'tasks.view_task',
            base_queryset=Task.objects.filter(
                is_archived=False,
                task_quizzes__isnull=False,
            ),
        )
        tasks = engine.scope_filter(
            'tasks.view_grading',
            base_queryset=base_tasks.prefetch_related(
                Prefetch(
                    'task_quizzes',
                    queryset=TaskQuiz.objects.annotate(question_count_value=Count('quiz_questions')),
                )
            ),
        ).distinct().order_by('-created_at')

        filtered_tasks: list[tuple[Task, list[TaskQuiz]]] = []
        quiz_ids: list[int] = []
        for task in tasks:
            task_quizzes = list(task.task_quizzes.all())
            if task_quizzes:
                filtered_tasks.append((task, task_quizzes))
                quiz_ids.extend(tq.id for tq in task_quizzes)

        metrics = get_pending_quiz_metrics(quiz_ids)

        results = []
        for task, task_quizzes in filtered_tasks:
            quizzes_data = []
            for tq in task_quizzes:
                pending_count, has_analysis_data = metrics.get(tq.id, (0, False))
                if pending_count <= 0 and not has_analysis_data:
                    continue

                quizzes_data.append({
                    'quiz_id': tq.id,
                    'quiz_title': tq.title,
                    'allow_retry': tq.allow_retry,
                    'kind_label': tq.kind_label,
                    'question_count': tq.question_count_value,
                    'duration': tq.duration,
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
