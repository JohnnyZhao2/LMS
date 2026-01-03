"""
Submission management services.

Provides business logic for:
- Practice and exam submission management
- Answer saving and grading
- Auto-grading for objective questions
- Submission status management

This service layer separates business logic from Views and Serializers,
improving code reusability and testability.
"""
from typing import List, Optional, Dict, Any, Tuple
from decimal import Decimal
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from core.exceptions import BusinessError, ErrorCodes
from apps.users.models import User
from apps.users.permissions import get_current_role
from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.quizzes.models import Quiz

from .models import Submission, Answer


class SubmissionService:
    """
    Service for submission management operations.
    
    Handles:
    - Starting practice/exam sessions
    - Saving answers
    - Submitting and auto-grading
    - Submission status management
    """
    
    @staticmethod
    def get_submission_by_id(pk: int, user: User = None) -> Submission:
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
        try:
            queryset = Submission.objects.select_related(
                'task_assignment__task', 'quiz'
            ).prefetch_related(
                'answers__question'
            )
            if user:
                return queryset.get(pk=pk, user=user)
            return queryset.get(pk=pk)
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
    
    @staticmethod
    def validate_assignment_for_quiz(
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
        try:
            assignment = TaskAssignment.objects.select_related('task').get(
                id=assignment_id,
                assignee=user,
                task__is_deleted=False
            )
        except TaskAssignment.DoesNotExist:
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
        try:
            task_quiz = TaskQuiz.objects.select_related('quiz').get(
                task_id=assignment.task_id, quiz_id=quiz_id
            )
        except TaskQuiz.DoesNotExist:
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
    
    @staticmethod
    def check_exam_constraints(
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
        existing = Submission.objects.filter(
            task_assignment=assignment,
            quiz_id=quiz_id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).first()
        if existing:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='您已提交过此考试，无法重新作答'
            )
        
        # Check for in-progress submission
        in_progress = Submission.objects.filter(
            task_assignment=assignment,
            quiz_id=quiz_id,
            status='IN_PROGRESS'
        ).first()
        
        return in_progress
    
    @staticmethod
    @transaction.atomic
    def start_quiz(
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
            existing_count = Submission.objects.filter(
                task_assignment=assignment,
                quiz=quiz_version
            ).count()
            attempt_number = existing_count + 1
        
        # Calculate remaining seconds for exam
        remaining_seconds = None
        if is_exam and task_quiz.quiz.duration:
            remaining_seconds = task_quiz.quiz.duration * 60
        
        # Create submission
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz_version,
            user=user,
            attempt_number=attempt_number,
            status='IN_PROGRESS',
            total_score=total_score,
            remaining_seconds=remaining_seconds
        )
        
        # Create answer records
        questions = quiz_version.get_ordered_questions()
        for relation in questions:
            Answer.objects.create(
                submission=submission,
                question_id=relation.question_id
            )
        
        return submission
    
    @staticmethod
    def save_answer(
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
        
        try:
            answer = Answer.objects.get(
                submission=submission,
                question_id=question_id
            )
        except Answer.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='该题目不在此答卷中'
            )
        
        answer.user_answer = user_answer
        answer.save(update_fields=['user_answer', 'updated_at'])
        return answer
    
    @staticmethod
    def submit(submission: Submission, is_practice: bool = True) -> Submission:
        """
        Submit a quiz/exam.
        
        Args:
            submission: The submission to submit
            is_practice: Whether this is a practice (affects status)
            
        Returns:
            Updated Submission instance
            
        Raises:
            BusinessError: If submission already submitted
        """
        if submission.status != 'IN_PROGRESS':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此答卷已提交'
            )
        
        submission.submit(is_practice=is_practice)
        submission.refresh_from_db()
        return submission
    
    @staticmethod
    def get_practice_history(
        assignment: TaskAssignment
    ) -> List[Dict[str, Any]]:
        """
        Get practice history for a task assignment.
        
        Args:
            assignment: Task assignment
            
        Returns:
            List of quiz practice history dicts
        """
        task_quizzes = TaskQuiz.objects.filter(
            task=assignment.task
        ).select_related('quiz')
        
        result = []
        for tq in task_quizzes:
            quiz = tq.quiz
            
            submissions = Submission.objects.filter(
                task_assignment=assignment,
                quiz=quiz,
                status__in=['SUBMITTED', 'GRADING', 'GRADED']
            )
            
            attempt_count = submissions.count()
            
            if attempt_count > 0:
                latest = submissions.order_by('-submitted_at').first()
                best = submissions.order_by('-obtained_score').first()
                
                result.append({
                    'quiz_id': quiz.id,
                    'quiz_title': quiz.title,
                    'attempt_count': attempt_count,
                    'latest_score': latest.obtained_score if latest else None,
                    'best_score': best.obtained_score if best else None,
                    'latest_submission_id': latest.id if latest else None,
                    'best_submission_id': best.id if best else None,
                })
            else:
                result.append({
                    'quiz_id': quiz.id,
                    'quiz_title': quiz.title,
                    'attempt_count': 0,
                    'latest_score': None,
                    'best_score': None,
                    'latest_submission_id': None,
                    'best_submission_id': None,
                })
        
        return result


class GradingService:
    """
    Service for grading operations.
    
    Handles:
    - Grading list retrieval with permission filtering
    - Subjective question grading
    - Batch grading
    - Grading status management
    """
    
    @staticmethod
    def get_grading_queryset(user: User) -> QuerySet:
        """
        Get submissions pending grading based on user's role.
        
        Args:
            user: The grading user
            
        Returns:
            QuerySet of submissions pending grading
        """
        current_role = get_current_role(user)
        
        queryset = Submission.objects.filter(
            status='GRADING'
        ).select_related(
            'quiz', 'user', 'task_assignment__task'
        )
        
        if current_role == 'ADMIN':
            pass  # Admin can see all
        elif current_role == 'MENTOR':
            queryset = queryset.filter(user__mentor=user)
        elif current_role == 'DEPT_MANAGER':
            if user.department_id:
                queryset = queryset.filter(user__department_id=user.department_id)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.none()
        
        return queryset.order_by('-submitted_at')
    
    @staticmethod
    def get_submission_for_grading(pk: int, user: User) -> Submission:
        """
        Get a submission for grading with permission check.
        
        Args:
            pk: Submission primary key
            user: Grading user
            
        Returns:
            Submission instance
            
        Raises:
            BusinessError: If not found or permission denied
        """
        try:
            submission = Submission.objects.select_related(
                'quiz', 'user', 'task_assignment__task'
            ).prefetch_related(
                'answers__question', 'answers__graded_by'
            ).get(pk=pk)
        except Submission.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答题记录不存在'
            )
        
        # Check permission
        GradingService._check_grading_permission(submission, user)
        
        return submission
    
    @staticmethod
    def _check_grading_permission(submission: Submission, user: User) -> None:
        """
        Check if user has permission to grade a submission.
        
        Args:
            submission: The submission
            user: The grading user
            
        Raises:
            BusinessError: If permission denied
        """
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            return
        elif current_role == 'MENTOR':
            if submission.user.mentor != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此答题记录'
                )
        elif current_role == 'DEPT_MANAGER':
            if submission.user.department_id != user.department_id:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此答题记录'
                )
        else:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问此答题记录'
            )
    
    @staticmethod
    def grade_answer(
        submission: Submission,
        answer_id: int,
        score: Decimal,
        comment: str,
        grader: User
    ) -> Answer:
        """
        Grade a subjective answer.
        
        Args:
            submission: The submission
            answer_id: Answer ID
            score: Score to assign
            comment: Grading comment
            grader: User doing the grading
            
        Returns:
            Graded Answer instance
            
        Raises:
            BusinessError: If validation fails
        """
        if submission.status != 'GRADING':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此答卷不在待评分状态'
            )
        
        try:
            answer = Answer.objects.select_related('question').get(
                id=answer_id,
                submission=submission
            )
        except Answer.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='答案不存在'
            )
        
        # Check it's a subjective question
        if answer.is_objective:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='客观题不需要人工评分'
            )
        
        # Check score range
        if score < 0 or score > answer.question.score:
            raise BusinessError(
                code=ErrorCodes.INVALID_PARAMS,
                message=f'分数必须在 0 到 {answer.question.score} 之间'
            )
        
        # Grade the answer
        answer.grade(grader, score, comment)
        
        return answer
    
    @staticmethod
    def batch_grade(
        submission: Submission,
        grades: List[Dict[str, Any]],
        grader: User
    ) -> Tuple[List[Answer], List[Dict[str, Any]]]:
        """
        Batch grade multiple answers.
        
        Args:
            submission: The submission
            grades: List of grade dicts with answer_id, score, comment
            grader: User doing the grading
            
        Returns:
            Tuple of (graded_answers, errors)
        """
        if submission.status != 'GRADING':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='此答卷不在待评分状态'
            )
        
        graded = []
        errors = []
        
        for grade_data in grades:
            try:
                answer = GradingService.grade_answer(
                    submission=submission,
                    answer_id=grade_data.get('answer_id'),
                    score=Decimal(str(grade_data.get('score', 0))),
                    comment=grade_data.get('comment', ''),
                    grader=grader
                )
                graded.append(answer)
            except BusinessError as e:
                errors.append({
                    'answer_id': grade_data.get('answer_id'),
                    'error': e.message
                })
        
        return graded, errors
