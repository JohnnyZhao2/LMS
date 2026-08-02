"""阅卷中心：管理端查询与主观题评分门面。

基于 submissions 的最新有效答卷做分析/评分，不维护独立评分模型。
客观分析与主观阅卷使用不同的「最新尝试」状态集合，不可混用。
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.db.models import Count, Exists, F, OuterRef, Prefetch, Subquery

from apps.activity_logs.decorators import log_operation
from apps.authorization.engine import enforce, scope_learning_members
from apps.quizzes.models import QUIZ_TYPE_CHOICES
from apps.submissions.models import Answer, AnswerSelection, Submission
from apps.submissions.workflows import grade_subjective_answer
from apps.tasks.models import Task, TaskQuiz
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes


#: 主观题「通过率」统计阈值（已评分答案得分占比），不是考试及格线
SUBJECTIVE_PASS_RATIO = Decimal('0.6')

VALID_QUIZ_TYPES = frozenset(code for code, _ in QUIZ_TYPE_CHOICES)


def has_answer_content(user_answer):
    if user_answer is None:
        return False
    if isinstance(user_answer, str):
        return user_answer.strip() != ''
    if isinstance(user_answer, (list, tuple, set, dict)):
        return len(user_answer) > 0
    return True


def _is_objective_answer_correct(answer):
    if answer.is_correct is not None:
        return bool(answer.is_correct)

    user_answer = answer.user_answer
    if not has_answer_content(user_answer):
        return False

    is_correct, _ = answer.question.check_answer(user_answer, full_score=answer.max_score)
    return bool(is_correct)


def _pass_rate_from_answers(answers, *, max_score, is_objective):
    """基于已加载的最新 answers 计算通过率。"""
    if is_objective:
        answered = [answer for answer in answers if has_answer_content(answer.user_answer)]
        if not answered:
            return None
        correct_count = sum(1 for answer in answered if _is_objective_answer_correct(answer))
        return round(correct_count / len(answered) * 100, 1)

    graded = [answer for answer in answers if answer.graded_by_id is not None]
    if not graded:
        return None

    threshold = max_score * SUBJECTIVE_PASS_RATIO
    correct_count = sum(1 for answer in graded if answer.obtained_score >= threshold)
    return round(correct_count / len(graded) * 100, 1)


def _student_summary(user):
    return {
        'student_id': user.id,
        'student_name': user.username,
        'avatar_key': user.avatar_key,
        'employee_id': user.employee_id or '',
        'department': user.department.name if user.department else '',
    }


class GradingService(BaseService):
    """阅卷中心业务。"""

    def list_grading_tasks(self, quiz_type=None):
        """当前人员范围内可阅卷的任务与试卷列表。"""
        if quiz_type is not None and quiz_type != '':
            if quiz_type not in VALID_QUIZ_TYPES:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='quiz_type 仅支持 EXAM 或 PRACTICE',
                )
        else:
            quiz_type = None

        enforce('grading.view', self.request, error_message='无权访问阅卷中心')

        pending_map, analysis_keys = self._quiz_stats_maps()
        scoped_ids = scope_learning_members(self.request).values('id')
        tasks = (
            Task.objects.filter(
                task_quizzes__isnull=False,
                assignments__assignee_id__in=scoped_ids,
            )
            .prefetch_related(
                Prefetch(
                    'task_quizzes',
                    queryset=TaskQuiz.objects.select_related('quiz'),
                )
            )
            .distinct()
            .order_by('-created_at')
        )

        results = []
        for task in tasks:
            task_quizzes = list(task.task_quizzes.all())
            if quiz_type:
                task_quizzes = [tq for tq in task_quizzes if tq.quiz.quiz_type == quiz_type]
            if not task_quizzes:
                continue

            quizzes_data = []
            for task_quiz in task_quizzes:
                key = (task.id, task_quiz.id)
                pending_count = pending_map.get(key, 0)
                if pending_count <= 0 and key not in analysis_keys:
                    continue
                quiz = task_quiz.quiz
                quizzes_data.append({
                    'quiz_id': task_quiz.id,
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

        return results

    def list_questions(self, task_id, task_quiz_id):
        """任务试卷题目列表及通过率。"""
        task = self._get_authorized_task(task_id, 'grading.view', '无权访问阅卷中心')
        task_quiz = self._get_task_quiz(task, task_quiz_id)
        relations = list(
            task_quiz.quiz.quiz_questions.prefetch_related('question_options').order_by('order')
        )

        objective_by_question = defaultdict(list)
        reviewable_by_question = defaultdict(list)
        if any(relation.is_objective for relation in relations):
            for answer in self._latest_quiz_answers(
                task,
                task_quiz.id,
                statuses=Submission.ANALYTICS_STATUSES,
            ):
                objective_by_question[answer.question_id].append(answer)
        if any(not relation.is_objective for relation in relations):
            for answer in self._latest_quiz_answers(
                task,
                task_quiz.id,
                statuses=Submission.COMPLETED_STATUSES,
            ):
                reviewable_by_question[answer.question_id].append(answer)

        results = []
        for relation in relations:
            answers = (
                objective_by_question[relation.id]
                if relation.is_objective
                else reviewable_by_question[relation.id]
            )
            results.append({
                'question_id': relation.id,
                'question_text': relation.content,
                'question_analysis': relation.explanation or '',
                'question_type': relation.question_type,
                'question_type_display': relation.get_question_type_display(),
                'max_score': float(relation.score),
                'pass_rate': _pass_rate_from_answers(
                    answers,
                    max_score=relation.score,
                    is_objective=relation.is_objective,
                ),
            })
        return results

    def get_question_analysis(self, task_id, task_quiz_id, question_id):
        """单题作答分布或主观题答案列表。"""
        task = self._get_authorized_task(task_id, 'grading.view', '无权访问阅卷中心')
        task_quiz = self._get_task_quiz(task, task_quiz_id)
        relation = (
            task_quiz.quiz.quiz_questions.prefetch_related('question_options')
            .filter(id=question_id)
            .first()
        )
        if not relation:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应题目或题目不属于该试卷',
            )

        statuses = (
            Submission.ANALYTICS_STATUSES
            if relation.is_objective
            else Submission.COMPLETED_STATUSES
        )
        answers = list(
            self._latest_quiz_answers(task, task_quiz.id, statuses=statuses)
            .filter(question_id=question_id)
            .select_related(
                'submission__task_assignment__assignee',
                'submission__task_assignment__assignee__department',
            )
            .order_by('graded_by', 'submission__submitted_at')
        )
        pass_rate = _pass_rate_from_answers(
            answers,
            max_score=relation.score,
            is_objective=relation.is_objective,
        )

        if relation.is_objective:
            return {
                'question_id': relation.id,
                'question_type': relation.question_type,
                'pass_rate': pass_rate,
                'answered_count': sum(
                    1 for answer in answers if has_answer_content(answer.user_answer)
                ),
                'options': self._build_objective_options(relation, answers),
            }

        return {
            'question_id': relation.id,
            'question_type': relation.question_type,
            'pass_rate': pass_rate,
            'subjective_answers': self._build_subjective_answers(answers),
        }

    @log_operation(
        'grading',
        'manual_grade',
        '{student_label}，{score}/{max_score_text} 分',
        target_type='quiz',
        target_title_template='{quiz_title}',
        group='阅卷中心',
        label='提交评分',
    )
    def grade_answer(
        self,
        task_id,
        *,
        quiz_id,
        question_id,
        student_id,
        score,
        comments='',
    ):
        """为主观题提交人工评分。"""
        task = self._get_authorized_task(task_id, 'grading.score', '无权提交评分')
        task_quiz = self._get_task_quiz(task, quiz_id)
        answer = (
            self._latest_quiz_answers(
                task,
                task_quiz.id,
                statuses=Submission.COMPLETED_STATUSES,
            )
            .filter(
                question_id=question_id,
                submission__task_assignment__assignee_id=student_id,
            )
            .select_related(
                'question',
                'submission__quiz',
                'submission__task_assignment__assignee',
            )
            .first()
        )
        if not answer:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='未找到对应的答案记录',
            )

        return grade_subjective_answer(
            answer,
            grader=self.user,
            score=score,
            comment=comments or '',
        )

    def _get_authorized_task(self, task_id, permission_code, error_message):
        task = Task.objects.filter(pk=task_id).first()
        self.validate_not_none(task, f'任务 {task_id} 不存在')
        enforce(
            permission_code,
            self.request,
            resource=task,
            error_message=error_message,
        )
        return task

    def _get_task_quiz(self, task, task_quiz_id):
        task_quiz = (
            TaskQuiz.objects.select_related('quiz')
            .filter(id=task_quiz_id, task=task)
            .first()
        )
        if not task_quiz:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不属于该任务',
            )
        return task_quiz

    def _scoped_assignee_subquery(self):
        return scope_learning_members(self.request).values('id')

    def _latest_submission_subquery(self, statuses):
        return (
            Submission.objects.filter(
                task_assignment_id=OuterRef('submission__task_assignment_id'),
                task_quiz_id=OuterRef('submission__task_quiz_id'),
                status__in=statuses,
            )
            .order_by('-attempt_number', '-submitted_at', '-id')
            .values('id')[:1]
        )

    def _latest_quiz_answers(self, task, task_quiz_id, *, statuses):
        resolved = tuple(statuses)
        return (
            Answer.objects.filter(
                submission__task_assignment__task=task,
                submission__task_assignment__assignee_id__in=self._scoped_assignee_subquery(),
                submission__task_quiz_id=task_quiz_id,
                submission__status__in=resolved,
            )
            .select_related('question')
            .prefetch_related(
                'question__question_options',
                Prefetch(
                    'answer_selections',
                    queryset=AnswerSelection.objects.select_related('question_option'),
                ),
            )
            .annotate(latest_submission_id=Subquery(self._latest_submission_subquery(resolved)))
            .filter(submission_id=F('latest_submission_id'))
        )

    def _latest_submissions_qs(self, *, statuses):
        resolved = tuple(statuses)
        latest_id = (
            Submission.objects.filter(
                task_assignment_id=OuterRef('task_assignment_id'),
                task_quiz_id=OuterRef('task_quiz_id'),
                status__in=resolved,
            )
            .order_by('-attempt_number', '-submitted_at', '-id')
            .values('id')[:1]
        )
        return (
            Submission.objects.filter(
                status__in=resolved,
                task_assignment__assignee_id__in=self._scoped_assignee_subquery(),
            )
            .annotate(latest_id=Subquery(latest_id))
            .filter(id=F('latest_id'))
        )

    def _quiz_stats_maps(self):
        """批量聚合 pending_count 与是否有分析数据。"""
        reviewable_ids = self._latest_submissions_qs(
            statuses=Submission.COMPLETED_STATUSES,
        ).values('id')
        analytics_ids = self._latest_submissions_qs(
            statuses=Submission.ANALYTICS_STATUSES,
        ).values('id')

        pending_map = {
            (row['task_id'], row['task_quiz_id']): row['pending_count']
            for row in (
                Answer.objects.filter(
                    submission_id__in=reviewable_ids,
                    submission__status__in=Submission.PENDING_REVIEW_STATUSES,
                    question__question_type='SHORT_ANSWER',
                    graded_by__isnull=True,
                )
                .values(
                    task_id=F('submission__task_assignment__task_id'),
                    task_quiz_id=F('submission__task_quiz_id'),
                )
                .annotate(pending_count=Count('id'))
            )
        }

        subjective_keys = set(
            Answer.objects.filter(
                submission_id__in=reviewable_ids,
                question__question_type='SHORT_ANSWER',
            ).values_list(
                'submission__task_assignment__task_id',
                'submission__task_quiz_id',
            ).distinct()
        )
        objective_keys = set(
            Answer.objects.filter(
                submission_id__in=analytics_ids,
            )
            .exclude(question__question_type='SHORT_ANSWER')
            .filter(Exists(AnswerSelection.objects.filter(answer_id=OuterRef('pk'))))
            .values_list(
                'submission__task_assignment__task_id',
                'submission__task_quiz_id',
            )
            .distinct()
        )
        return pending_map, subjective_keys | objective_keys

    def _build_objective_options(self, question, answers):
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
                if question.question_type == 'MULTIPLE_CHOICE':
                    selected = isinstance(user_answer, list) and option_key in user_answer
                else:
                    selected = user_answer == option_key
                if not selected:
                    continue
                selected_count += 1
                students.append(_student_summary(answer.submission.task_assignment.assignee))

            option_payload.append({
                'option_key': option_key,
                'option_text': option_text,
                'selected_count': selected_count,
                'is_correct': option_key in correct_keys,
                'students': students,
            })

        return option_payload

    def _build_subjective_answers(self, answers):
        results = []
        for answer in answers:
            payload = _student_summary(answer.submission.task_assignment.assignee)
            payload.update({
                'answer_text': answer.text_answer,
                'submitted_at': answer.submission.submitted_at,
                'score': float(answer.obtained_score) if answer.graded_by_id else None,
            })
            results.append(payload)
        return results
