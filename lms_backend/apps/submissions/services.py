"""
Submission management services.
Provides business logic for:
- Practice and exam submission management
- Answer saving and auto-grading
- Submission status management
This service layer separates business logic from Views and Serializers,
improving code reusability and testability.
"""
from typing import Any, List, Optional, Tuple

from django.db import transaction
from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from apps.quizzes.models import Quiz
from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.users.models import User
from core.base_service import BaseService
from core.decorators import log_operation
from core.exceptions import BusinessError, ErrorCodes

from .models import Answer, AnswerSelection, Submission
from .scoring import calculate_submission_obtained_score, refresh_assignment_score

UNSET = object()


class SubmissionService(BaseService):
    """
    Service for submission management operations.
    Handles:
    - Starting practice/exam sessions
    - Saving answers
    - Submitting and auto-grading
    - Submission status management
    """

    def _base_queryset(self, user: Optional[User] = None) -> QuerySet:
        """基础查询集，统一 select_related/prefetch_related"""
        qs = Submission.objects.select_related(
            'task_assignment__task',
            'quiz',
            'user'
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
        """按 ID 获取提交记录"""
        return self._base_queryset(user=user).filter(pk=pk).first()

    def _get_in_progress(self, task_assignment_id: int, quiz_id: int) -> Optional[Submission]:
        """获取进行中的提交记录"""
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id,
            status='IN_PROGRESS'
        ).first()

    def get_in_progress(self, task_assignment_id: int, quiz_id: int) -> Optional[Submission]:
        """Public wrapper for in-progress submission lookup."""
        return self._get_in_progress(task_assignment_id=task_assignment_id, quiz_id=quiz_id)

    def _get_existing_submitted(self, task_assignment_id: int, quiz_id: int) -> Optional[Submission]:
        """获取已提交的提交记录"""
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).first()

    def _count_attempts(self, task_assignment_id: int, quiz_id: int) -> int:
        """统计提交次数"""
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id
        ).count()

    def _get_answer_by_submission_and_question(
        self,
        submission_id: int,
        question_id: int
    ) -> Optional[Answer]:
        """按提交和题目获取答案"""
        return Answer.objects.select_related('question').prefetch_related(
            'question__question_options',
            Prefetch(
                'answer_selections',
                queryset=AnswerSelection.objects.select_related('question_option'),
            ),
        ).filter(
            submission_id=submission_id,
            question_id=question_id
        ).first()

    def _list_objective_answers(self, submission_id: int) -> QuerySet:
        """获取客观题答案列表"""
        return Answer.objects.filter(
            submission_id=submission_id,
            question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
        ).select_related('question').prefetch_related(
            'question__question_options',
            Prefetch(
                'answer_selections',
                queryset=AnswerSelection.objects.select_related('question_option'),
            ),
        )

    def _create_with_answers(self, answers_data: List[dict], **submission_data) -> Submission:
        submission = Submission.objects.create(**submission_data)
        Answer.objects.bulk_create([
            Answer(
                submission=submission,
                question_id=answer_data['question_id'],
            )
            for answer_data in answers_data
        ])
        return submission

    def _normalize_user_answer_input(self, answer: Answer, user_answer: Any) -> dict[str, Any]:
        """将接口层答案转换为存储层结构。"""
        question = answer.question

        if question.is_subjective:
            if user_answer in (None, ''):
                return {'text_answer': ''}
            if not isinstance(user_answer, str):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='简答题答案必须是字符串',
                )
            return {'text_answer': user_answer}

        option_key_map = question.get_option_key_map()
        if question.question_type == 'MULTIPLE_CHOICE':
            if user_answer in (None, ''):
                return {'option_ids': []}
            if not isinstance(user_answer, list):
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='多选题答案必须是列表',
                )

            normalized_keys: list[str] = []
            for item in user_answer:
                if not isinstance(item, str) or item not in option_key_map:
                    raise BusinessError(
                        code=ErrorCodes.VALIDATION_ERROR,
                        message='多选题答案包含无效选项',
                    )
                if item not in normalized_keys:
                    normalized_keys.append(item)

            return {
                'option_ids': [
                    option_key_map[key]['id']
                    for key in normalized_keys
                ],
            }

        if user_answer in (None, ''):
            return {'option_ids': []}
        if not isinstance(user_answer, str):
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='客观题答案必须是字符串',
            )
        if user_answer not in option_key_map:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='答案必须是有效的选项',
            )
        return {'option_ids': [option_key_map[user_answer]['id']]}

    def _sync_answer_option_ids(self, answer: Answer, option_ids: list[int]) -> None:
        """同步客观题所选选项。"""
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
        """
        Get a submission by ID.
        Args:
            pk: Submission primary key
            user: Optional user to verify ownership
        Returns:
            Submission instance
        Raises:
            BusinessError: If submission not found or not owned by user
        """
        submission = self._get_submission_by_id(pk=pk, user=user)
        self.validate_not_none(submission, f'答题记录 {pk} 不存在')
        return submission

    def validate_assignment_for_quiz(
        self,
        assignment_id: int,
        quiz_id: int,
        user: User
    ) -> Tuple[TaskAssignment, TaskQuiz, Quiz]:
        """
        Validate that a quiz can be started for an assignment.
        Args:
            assignment_id: Task assignment ID
            quiz_id: Quiz ID
            user: User starting the quiz
        Returns:
            Tuple of (TaskAssignment, TaskQuiz, Quiz)
        Raises:
            BusinessError: If validation fails
        """
        # Check task assignment exists
        assignment = TaskAssignment.objects.select_related('task').filter(
            id=assignment_id,
            assignee=user,
            task__is_deleted=False
        ).first()
        if not assignment:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在或未分配给您'
            )
        # Check task has quizzes
        if not assignment.task.has_quiz:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此任务不包含试卷'
            )
        # Check quiz is part of the task
        task_quiz = TaskQuiz.objects.select_related('quiz').filter(
            task_id=assignment.task_id,
            quiz_id=quiz_id
        ).first()
        if not task_quiz:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='该试卷不在此任务中'
            )
        quiz = task_quiz.quiz
        return assignment, task_quiz, quiz

    def check_exam_constraints(
        self,
        assignment: TaskAssignment,
        quiz_id: int
    ) -> Optional[Submission]:
        """
        Check exam-specific constraints.
        Args:
            assignment: Task assignment
            quiz_id: Quiz ID
        Returns:
            In-progress submission if exists, None otherwise
        Raises:
            BusinessError: If exam constraints violated
        """
        task = assignment.task
        now = timezone.now()
        # Check deadline
        if now > task.deadline:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已结束'
            )
        # Check if already submitted
        existing = self._get_existing_submitted(
            task_assignment_id=assignment.id,
            quiz_id=quiz_id
        )
        if existing:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='您已提交过此考试，无法重新作答'
            )
        # Check for in-progress submission
        in_progress = self._get_in_progress(
            task_assignment_id=assignment.id,
            quiz_id=quiz_id
        )
        return in_progress

    @transaction.atomic
    @log_operation(
        'submission',
        'start_quiz',
        '第 {attempt_number} 次，{quiz_type_label}，{total_score_text} 分',
        target_type='quiz',
        target_title_template='{quiz_title}',
    )
    def start_quiz(
        self,
        assignment: TaskAssignment,
        task_quiz: TaskQuiz,
        user: User,
        is_exam: bool = False
    ) -> Submission:
        """
        Start a new quiz submission.
        Args:
            assignment: Task assignment
            task_quiz: TaskQuiz relation
            user: User starting the quiz
            is_exam: Whether this is an exam (affects attempt counting)
        Returns:
            Created Submission instance
        """
        # Get quiz from FK (already points to specific version)
        quiz = task_quiz.quiz
        total_score = quiz.total_score
        # Calculate attempt number
        if is_exam:
            attempt_number = 1
        else:
            existing_count = self._count_attempts(
                task_assignment_id=assignment.id,
                quiz_id=quiz.id
            )
            attempt_number = existing_count + 1
        # Calculate remaining seconds for exam
        remaining_seconds = None
        if is_exam and quiz.duration:
            remaining_seconds = quiz.duration * 60
        # Prepare answer data
        questions = quiz.quiz_questions.order_by('order').values_list('question_id', flat=True)
        answers_data = [
            {
                'question_id': question_id,
            }
            for question_id in questions
        ]
        # Create submission with answers
        submission = self._create_with_answers(
            answers_data=answers_data,
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            attempt_number=attempt_number,
            status='IN_PROGRESS',
            total_score=total_score,
            remaining_seconds=remaining_seconds
        )
        return submission

    def save_answer(
        self,
        submission: Submission,
        question_id: int,
        user_answer: Any = UNSET,
        is_marked: Any = UNSET,
    ) -> Answer:
        """
        Save an answer for a question.
        Args:
            submission: The submission
            question_id: Question ID
            user_answer: User's answer
        Returns:
            Updated Answer instance
        Raises:
            BusinessError: If submission not in progress or question not found
        """
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='只能在答题中保存答案'
            )
        answer = self._get_answer_by_submission_and_question(submission.id, question_id)
        self.validate_not_none(answer, '该题目不在此答卷中')
        update_fields = []
        if user_answer is not UNSET:
            normalized_answer = self._normalize_user_answer_input(answer, user_answer)
            if answer.question.is_subjective:
                next_text_answer = normalized_answer['text_answer']
                if answer.text_answer != next_text_answer:
                    answer.text_answer = next_text_answer
                    update_fields.append('text_answer')
                if answer.answer_selections.exists():
                    answer.answer_selections.all().delete()
                    prefetched_cache = getattr(answer, '_prefetched_objects_cache', None)
                    if prefetched_cache is not None:
                        prefetched_cache.pop('answer_selections', None)
            else:
                if answer.text_answer:
                    answer.text_answer = ''
                    update_fields.append('text_answer')
                self._sync_answer_option_ids(answer, normalized_answer['option_ids'])
        if is_marked is not UNSET:
            answer.is_marked = is_marked
            update_fields.append('is_marked')
        if update_fields:
            answer.save(update_fields=update_fields)
        return answer

    @transaction.atomic
    @log_operation(
        'submission',
        'submit',
        '第 {attempt_number} 次，{obtained_score_text}/{total_score_text} 分，{submission_status_detail}',
        target_type='quiz',
        target_title_template='{quiz_title}',
    )
    def submit(self, submission: Submission) -> Submission:
        """
        Submit a submission.
        Args:
            submission: The submission to submit
        Returns:
            Updated Submission instance
        Raises:
            BusinessError: If submission already submitted
        Properties:
        - Property 30: 客观题自动评分
        - Property 31: 主观题待评分状态
        - Property 32: 纯客观题直接完成
        """
        # 检查是否可以提交
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='只能提交答题中的记录'
            )
        # 自动评分客观题
        self._auto_grade_objective_questions(submission)
        # 计算总分
        self._calculate_score(submission)
        # 设置提交时间
        submission.submitted_at = timezone.now()
        # 根据是否包含主观题设置状态
        if submission.has_subjective_questions:
            submission.status = 'GRADING'
        else:
            # 纯客观题，直接完成
            submission.status = 'GRADED'
        submission.save()
        # 如果是纯客观题，更新任务分配
        if submission.status == 'GRADED':
            self._update_task_assignment(submission)
        # 检查任务是否应该自动完成（考试和练习都需要检查）
        self._check_task_completion(submission)

        return submission

    def _auto_grade_objective_questions(self, submission: Submission) -> None:
        """
        自动评分客观题
        Property 30: 客观题自动评分
        """
        objective_answers = self._list_objective_answers(submission.id)
        for answer in objective_answers:
            answer.auto_grade()

    def _calculate_score(self, submission: Submission) -> None:
        """计算当前得分"""
        submission.obtained_score = calculate_submission_obtained_score(submission)

    def _update_task_assignment(self, submission: Submission) -> None:
        """更新任务分配的成绩"""
        refresh_assignment_score(submission.task_assignment, Submission)

    def _check_task_completion(self, submission: Submission) -> None:
        """
        检查任务是否应该自动完成
        Property 25: 任务自动完成（适用于练习和考试）
        """
        assignment = submission.task_assignment
        assignment.check_completion()
