"""Submission management services."""

from typing import Any, List, Optional, Tuple

from apps.activity_logs.decorators import log_operation
from django.db import IntegrityError, transaction
from django.db.models import Max, Prefetch, QuerySet
from django.utils import timezone

from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import Answer, AnswerSelection, Submission
from .scoring import calculate_submission_obtained_score, refresh_assignment_score

# 区分“调用方未传字段”和“调用方传了空值”的哨兵对象。
UNSET = object()


class SubmissionService(BaseService):
    """答题、保存答案、提交试卷的业务编排。"""

    def _base_queryset(self, user: Optional[User] = None) -> QuerySet:
        """答卷详情常用预加载，避免序列化答案时产生 N+1 查询。"""
        qs = Submission.objects.select_related(
            'task_assignment__task',
            'task_quiz',
            'quiz',
            'user',
        ).prefetch_related(
            'answers__question__question_options',
            Prefetch(
                'answers__answer_selections',
                queryset=AnswerSelection.objects.select_related('question_option'),
            ),
            'answers__question',
            'answers__graded_by',
        )
        if user:
            qs = qs.filter(user=user)
        return qs

    def _get_submission_by_id(self, pk: int, user: Optional[User] = None) -> Optional[Submission]:
        return self._base_queryset(user=user).filter(pk=pk).first()

    def _get_in_progress(self, task_assignment_id: int, task_quiz_id: int) -> Optional[Submission]:
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            task_quiz_id=task_quiz_id,
            status='IN_PROGRESS',
        ).first()

    def get_in_progress(self, task_assignment_id: int, quiz_id: int) -> Optional[Submission]:
        return self._get_in_progress(task_assignment_id=task_assignment_id, task_quiz_id=quiz_id)

    def _get_existing_submitted(self, task_assignment_id: int, task_quiz_id: int) -> Optional[Submission]:
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            task_quiz_id=task_quiz_id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED'],
        ).first()

    def _next_attempt_number(self, task_assignment_id: int, task_quiz_id: int) -> int:
        """下一次 attempt_number = 当前最大编号 + 1。

        不用 count()+1：去重/删记录后可能留下 1、3 空洞，count 仍会算出已占用的编号。
        """
        current_max = Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            task_quiz_id=task_quiz_id,
        ).aggregate(max_attempt=Max('attempt_number'))['max_attempt']
        return 1 if current_max is None else current_max + 1

    def _get_answer_by_submission_and_question(
        self,
        submission_id: int,
        question_id: int,
    ) -> Optional[Answer]:
        return Answer.objects.select_related('question').prefetch_related(
            'question__question_options',
            Prefetch(
                'answer_selections',
                queryset=AnswerSelection.objects.select_related('question_option'),
            ),
        ).filter(
            submission_id=submission_id,
            question_id=question_id,
        ).first()

    def _list_objective_answers(self, submission_id: int) -> QuerySet:
        return Answer.objects.filter(
            submission_id=submission_id,
            question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE'],
        ).select_related('question').prefetch_related(
            'question__question_options',
            Prefetch(
                'answer_selections',
                queryset=AnswerSelection.objects.select_related('question_option'),
            ),
        )

    def _create_with_answers(self, answers_data: List[dict], **submission_data) -> Submission:
        submission = Submission.objects.create(**submission_data)
        Answer.objects.bulk_create(
            [Answer(submission=submission, question_id=answer_data['question_id']) for answer_data in answers_data]
        )
        return submission

    def _normalize_user_answer_input(self, answer: Answer, user_answer: Any) -> dict[str, Any]:
        """把前端答案值转换为模型可写入的字段。

        客观题前端传选项 key，后端在试卷快照选项里解析成 option id。
        """
        question = answer.question
        if question.is_subjective:
            if user_answer in (None, ''):
                return {'text_answer': ''}
            if not isinstance(user_answer, str):
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='简答题答案必须是字符串')
            return {'text_answer': user_answer}

        option_key_map = question.get_option_key_map()
        if question.question_type == 'MULTIPLE_CHOICE':
            if user_answer in (None, ''):
                return {'option_ids': []}
            if not isinstance(user_answer, list):
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='多选题答案必须是列表')
            normalized_keys: list[str] = []
            for item in user_answer:
                if not isinstance(item, str) or item not in option_key_map:
                    raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='多选题答案包含无效选项')
                if item not in normalized_keys:
                    normalized_keys.append(item)
            return {'option_ids': [option_key_map[key]['id'] for key in normalized_keys]}

        if user_answer in (None, ''):
            return {'option_ids': []}
        if not isinstance(user_answer, str):
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='客观题答案必须是字符串')
        if user_answer not in option_key_map:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='答案必须是有效的选项')
        return {'option_ids': [option_key_map[user_answer]['id']]}

    def _sync_answer_option_ids(self, answer: Answer, option_ids: list[int]) -> None:
        """同步客观题选项关联，保留未变化的关联行。"""
        desired_ids = set(option_ids)
        existing_links = list(answer.answer_selections.all())
        existing_ids = {link.question_option_id for link in existing_links}
        stale_ids = existing_ids - desired_ids
        if stale_ids:
            answer.answer_selections.filter(question_option_id__in=stale_ids).delete()
        missing_ids = desired_ids - existing_ids
        if missing_ids:
            AnswerSelection.objects.bulk_create(
                [
                    AnswerSelection(answer=answer, question_option_id=option_id)
                    for option_id in option_ids
                    if option_id in missing_ids
                ]
            )
        prefetched_cache = getattr(answer, '_prefetched_objects_cache', None)
        if prefetched_cache is not None:
            prefetched_cache.pop('answer_selections', None)

    def get_submission_by_id(self, pk: int, user: User = None) -> Submission:
        submission = self._get_submission_by_id(pk=pk, user=user)
        self.validate_not_none(submission, f'答题记录 {pk} 不存在')
        return submission

    def validate_assignment_for_quiz(
        self,
        assignment_id: int,
        quiz_id: int,
        user: User,
    ) -> Tuple[TaskAssignment, TaskQuiz, Any]:
        """确认当前学员确实被分配了这张任务试卷。"""
        assignment = TaskAssignment.objects.select_related('task').filter(
            id=assignment_id,
            assignee=user,
        ).first()
        if not assignment:
            raise BusinessError(code=ErrorCodes.RESOURCE_NOT_FOUND, message='任务不存在或未分配给您')
        if not assignment.task.has_quiz:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='此任务不包含试卷')
        task_quiz = TaskQuiz.objects.select_related('quiz').filter(
            id=quiz_id,
            task_id=assignment.task_id,
        ).first()
        if not task_quiz:
            raise BusinessError(code=ErrorCodes.RESOURCE_NOT_FOUND, message='该试卷不在此任务中')
        return assignment, task_quiz, task_quiz.quiz

    def check_exam_constraints(self, assignment: TaskAssignment, quiz_id: int) -> Optional[Submission]:
        now = timezone.now()
        if now > assignment.task.deadline:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='任务已结束')
        existing = self._get_existing_submitted(task_assignment_id=assignment.id, task_quiz_id=quiz_id)
        if existing:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='您已提交过此考试，无法重新作答')
        return self._get_in_progress(task_assignment_id=assignment.id, task_quiz_id=quiz_id)

    def _lock_assignment(self, assignment_id: int) -> TaskAssignment:
        """只锁当前 TaskAssignment 行，串行化同一学员的开卷/恢复。

        不加 select_related('task')：FOR UPDATE 联表会顺带锁住 Task，
        导致同任务下其他学员开卷互相排队。
        """
        return TaskAssignment.objects.select_for_update().get(pk=assignment_id)

    @transaction.atomic
    def start_or_resume_quiz(
        self,
        assignment_id: int,
        quiz_id: int,
        user: User,
    ) -> tuple[Submission, bool]:
        """开始或恢复答题。

        考试只能有一次有效提交；练习允许多次作答，但同一份进行中答卷会复用。
        通过行锁串行化并发开卷，配合 DB 唯一约束防止重复 attempt。
        """
        assignment, task_quiz, quiz = self.validate_assignment_for_quiz(assignment_id, quiz_id, user)
        # 校验后再加锁，在锁内重新检查，避免 TOCTOU 双开卷
        assignment = self._lock_assignment(assignment.id)
        is_exam = quiz.quiz_type == 'EXAM'
        if is_exam:
            in_progress = self.check_exam_constraints(assignment, quiz_id)
        else:
            in_progress = self.get_in_progress(task_assignment_id=assignment.id, quiz_id=quiz_id)
        if in_progress:
            return in_progress, False
        try:
            # 内层 savepoint：唯一约束冲突时不污染外层事务，可回退为 resume
            with transaction.atomic():
                submission = self.start_quiz(
                    assignment=assignment,
                    task_quiz=task_quiz,
                    user=user,
                    is_exam=is_exam,
                )
        except IntegrityError:
            in_progress = self._get_in_progress(
                task_assignment_id=assignment.id,
                task_quiz_id=task_quiz.id,
            )
            if in_progress:
                return in_progress, False
            raise
        return submission, True

    @transaction.atomic
    @log_operation(
        'submission',
        'start_quiz',
        '第 {attempt_number} 次，{quiz_type_label}，{total_score_text} 分',
        target_type='quiz',
        target_title_template='{quiz_title}',
        group='答题/考试',
        label='开始答题',
    )
    def start_quiz(
        self,
        assignment: TaskAssignment,
        task_quiz: TaskQuiz,
        user: User,
        is_exam: bool = False,
    ) -> Submission:
        # 直接调用本方法时也加锁，保证 attempt_number 计算与写入原子
        assignment = self._lock_assignment(assignment.pk)
        quiz = task_quiz.quiz
        total_score = quiz.total_score
        attempt_number = 1 if is_exam else self._next_attempt_number(assignment.id, task_quiz.id)
        remaining_seconds = quiz.duration * 60 if is_exam and quiz.duration else None
        questions = quiz.quiz_questions.order_by('order').values_list('id', flat=True)
        # 每道快照题先生成空 Answer，后续保存答案只更新这批固定记录。
        answers_data = [{'question_id': question_id} for question_id in questions]
        submission = self._create_with_answers(
            answers_data,
            task_assignment=assignment,
            task_quiz=task_quiz,
            quiz=quiz,
            user=user,
            attempt_number=attempt_number,
            total_score=total_score,
            remaining_seconds=remaining_seconds,
        )
        return submission

    @transaction.atomic
    def save_answer(
        self,
        submission: Submission,
        question_id: int,
        user_answer: Any = UNSET,
        is_marked: bool = UNSET,
    ) -> Answer:
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='当前答卷不可继续作答')
        answer = self._get_answer_by_submission_and_question(submission.id, question_id)
        self.validate_not_none(answer, '题目不在此答卷中')

        update_fields = []
        if user_answer is not UNSET:
            normalized = self._normalize_user_answer_input(answer, user_answer)
            if answer.is_subjective:
                answer.text_answer = normalized['text_answer']
                update_fields.append('text_answer')
            else:
                self._sync_answer_option_ids(answer, normalized['option_ids'])
        if is_marked is not UNSET and answer.is_marked != is_marked:
            answer.is_marked = is_marked
            update_fields.append('is_marked')
        if update_fields:
            answer.save(update_fields=update_fields)
        return answer

    @transaction.atomic
    @log_operation(
        'submission',
        'submit_quiz',
        '{status_display}，{obtained_score_text}/{total_score_text}',
        target_type='quiz',
        target_title_template='{quiz_title}',
        group='答题/考试',
        label='提交答卷',
    )
    def submit(self, submission: Submission) -> Submission:
        """提交答卷并刷新成绩、任务完成状态。"""
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='该答卷已提交')

        task = submission.task_assignment.task
        if submission.quiz.quiz_type == 'EXAM':
            if timezone.now() > task.deadline:
                submission.status = 'GRADING' if submission.has_subjective_questions else 'SUBMITTED'
                submission.submitted_at = task.deadline
            else:
                submission.submitted_at = timezone.now()
                submission.status = 'GRADING' if submission.has_subjective_questions else 'SUBMITTED'
        else:
            submission.submitted_at = timezone.now()
            submission.status = 'GRADING' if submission.has_subjective_questions else 'SUBMITTED'

        for answer in self._list_objective_answers(submission.id):
            answer.auto_grade()

        submission.obtained_score = calculate_submission_obtained_score(submission)
        submission.save(update_fields=['status', 'submitted_at', 'obtained_score'])
        refresh_assignment_score(submission.task_assignment, Submission)
        if submission.status == 'SUBMITTED':
            from apps.tasks.assignment_workflow import sync_assignment_completion_status

            sync_assignment_completion_status(submission.task_assignment)
        submission.refresh_from_db()
        return submission
