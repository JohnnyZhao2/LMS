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

from core.exceptions import BusinessError, ErrorCodes
from core.base_service import BaseService
from apps.users.models import User
from apps.users.permissions import get_current_role
from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.tasks.repositories import TaskQuizRepository, TaskAssignmentRepository
from apps.quizzes.models import Quiz
from django.db.models import Sum

from .models import Submission, Answer
from .repositories import SubmissionRepository, AnswerRepository


class SubmissionService(BaseService):
    """
    Service for submission management operations.
    
    Handles:
    - Starting practice/exam sessions
    - Saving answers
    - Submitting and auto-grading
    - Submission status management
    """
    
    def __init__(self):
        self.repository = SubmissionRepository()
        self.answer_repository = AnswerRepository()
        self.task_quiz_repository = TaskQuizRepository()
        self.task_assignment_repository = TaskAssignmentRepository()
    
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
        submission = self.repository.get_by_id(pk=pk, user=user)
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
        assignment = self.task_assignment_repository.get_by_id_for_user(
            assignment_id=assignment_id,
            user=user
        )
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
        task_quiz = self.task_quiz_repository.get_by_task_and_quiz(
            task_id=assignment.task_id,
            quiz_id=quiz_id
        )
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
        existing = self.repository.get_existing_submitted(
            task_assignment_id=assignment.id,
            quiz_id=quiz_id
        )
        if existing:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='您已提交过此考试，无法重新作答'
            )
        
        # Check for in-progress submission
        in_progress = self.repository.get_in_progress(
            task_assignment_id=assignment.id,
            quiz_id=quiz_id
        )
        
        return in_progress
    
    @transaction.atomic
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
        # Get versioned quiz
        quiz_version = task_quiz.get_versioned_quiz()
        total_score = quiz_version.total_score
        
        # Calculate attempt number
        if is_exam:
            attempt_number = 1
        else:
            existing_count = self.repository.count_attempts(
                task_assignment_id=assignment.id,
                quiz_id=quiz_version.id
            )
            attempt_number = existing_count + 1
        
        # Calculate remaining seconds for exam
        remaining_seconds = None
        if is_exam and task_quiz.quiz.duration:
            remaining_seconds = task_quiz.quiz.duration * 60
        
        # Prepare answer data
        questions = quiz_version.get_ordered_questions()
        answers_data = [
            {
                'question_id': relation.question_id,
                'question_resource_uuid': relation.question.resource_uuid,
                'question_version_number': relation.question.version_number
            }
            for relation in questions
        ]
        
        # Create submission with answers
        submission = self.repository.create_with_answers(
            answers_data=answers_data,
            task_assignment=assignment,
            quiz=quiz_version,
            user=user,
            attempt_number=attempt_number,
            status='IN_PROGRESS',
            total_score=total_score,
            remaining_seconds=remaining_seconds,
            quiz_resource_uuid=quiz_version.resource_uuid,
            quiz_version_number=quiz_version.version_number
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
        
        answer = self.answer_repository.get_by_submission_and_question(
            submission_id=submission.id,
            question_id=question_id
        )
        self.validate_not_none(answer, '该题目不在此答卷中')
        
        answer = self.answer_repository.update(
            answer,
            user_answer=user_answer
        )
        return answer
    
    @transaction.atomic
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
        
        Requirements:
        - 10.3: 客观题自动评分
        - 12.4: 记录提交时间并进行客观题自动评分
        - 12.5: 包含主观题时状态设为"待评分"
        - 12.6: 仅包含客观题时直接计算最终成绩
        
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
        
        # 检查练习任务是否应该自动完成
        if is_practice:
            self._check_practice_completion(submission)
        
        return submission
    
    def _auto_grade_objective_questions(self, submission: Submission) -> None:
        """
        自动评分客观题
        
        Property 30: 客观题自动评分
        """
        objective_answers = self.answer_repository.get_objective_answers(submission.id)
        
        for answer in objective_answers:
            answer.auto_grade()
            self.answer_repository.update(answer, obtained_score=answer.obtained_score)
    
    def _calculate_score(self, submission: Submission) -> None:
        """计算当前得分"""
        all_answers = self.answer_repository.get_by_submission(submission.id)
        total_score = all_answers.aggregate(total=Sum('obtained_score'))['total'] or Decimal('0')
        
        submission.obtained_score = total_score
    
    def _update_task_assignment(self, submission: Submission) -> None:
        """更新任务分配的成绩"""
        assignment = submission.task_assignment
        
        # 更新成绩（取最高分）
        if assignment.score is None or submission.obtained_score > assignment.score:
            self.task_assignment_repository.update(
                assignment,
                score=submission.obtained_score
            )
    
    def _check_practice_completion(self, submission: Submission) -> None:
        """
        检查练习任务是否应该自动完成
        
        Property 25: 练习任务自动完成
        """
        assignment = submission.task_assignment
        assignment.check_completion()
    
