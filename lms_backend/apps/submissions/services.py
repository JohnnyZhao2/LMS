"""
Submission management services.
Provides business logic for:
- Practice and exam submission management
- Answer saving and auto-grading
- Submission status management
This service layer separates business logic from Views and Serializers,
improving code reusability and testability.
"""
from typing import List, Optional, Any, Tuple
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, QuerySet
from core.decorators import log_operation
from core.exceptions import BusinessError, ErrorCodes
from core.base_service import BaseService
from apps.users.models import User
from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.quizzes.models import Quiz
from .models import Submission, Answer


class SubmissionService(BaseService):
    """
    Service for submission management operations.
    Handles:
    - Starting practice/exam sessions
    - Saving answers
    - Submitting and auto-grading
    - Submission status management
    """

    def _submission_queryset(self, user: Optional[User] = None) -> QuerySet:
        qs = Submission.objects.select_related(
            'task_assignment__task',
            'quiz',
            'user'
        ).prefetch_related(
            'answers__question',
            'answers__graded_by'
        )
        if user:
            qs = qs.filter(user=user)
        return qs

    def _get_submission_by_id(self, pk: int, user: Optional[User] = None) -> Optional[Submission]:
        return self._submission_queryset(user=user).filter(pk=pk).first()

    def _get_in_progress(self, task_assignment_id: int, quiz_id: int) -> Optional[Submission]:
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id,
            status='IN_PROGRESS'
        ).first()

    def get_in_progress(self, task_assignment_id: int, quiz_id: int) -> Optional[Submission]:
        """Public wrapper for in-progress submission lookup."""
        return self._get_in_progress(task_assignment_id=task_assignment_id, quiz_id=quiz_id)

    def _get_existing_submitted(self, task_assignment_id: int, quiz_id: int) -> Optional[Submission]:
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).first()

    def _count_attempts(self, task_assignment_id: int, quiz_id: int) -> int:
        return Submission.objects.filter(
            task_assignment_id=task_assignment_id,
            quiz_id=quiz_id
        ).count()

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
        if quiz.is_deleted:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='试卷不存在'
            )
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
    @log_operation('submission', 'start_quiz', '开始答题：试卷《{result.quiz.title}》')
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
        questions = quiz.get_ordered_questions()
        answers_data = [
            {
                'question_id': relation.question_id,
            }
            for relation in questions
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
        user_answer: Any
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
        answer = Answer.objects.select_related('question').filter(
            submission_id=submission.id,
            question_id=question_id
        ).first()
        self.validate_not_none(answer, '该题目不在此答卷中')
        answer.user_answer = user_answer
        answer.save(update_fields=['user_answer'])
        return answer

    @transaction.atomic
    @log_operation('submission', 'submit', '提交答卷：试卷《{result.quiz.title}》')
    def submit(self, submission: Submission, is_practice: bool = True) -> Submission:
        """
        Submit a quiz/exam.
        Args:
            submission: The submission to submit
            is_practice: Whether this is a practice (affects status)
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
        objective_answers = Answer.objects.filter(
            submission_id=submission.id,
            question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
        ).select_related('question')
        for answer in objective_answers:
            answer.auto_grade()

    def _calculate_score(self, submission: Submission) -> None:
        """计算当前得分"""
        total_score = Answer.objects.filter(
            submission_id=submission.id
        ).aggregate(total=Sum('obtained_score'))['total'] or Decimal('0')
        submission.obtained_score = total_score

    def _update_task_assignment(self, submission: Submission) -> None:
        """更新任务分配的成绩"""
        assignment = submission.task_assignment
        # 更新成绩（取最高分）
        if assignment.score is None or submission.obtained_score > assignment.score:
            assignment.score = submission.obtained_score
            assignment.save(update_fields=['score'])

    def _check_task_completion(self, submission: Submission) -> None:
        """
        检查任务是否应该自动完成
        Property 25: 任务自动完成（适用于练习和考试）
        """
        assignment = submission.task_assignment
        assignment.check_completion()
