"""
Submission selectors for LMS.
Provides optimized query functions for submission-related data retrieval.
"""
from typing import Optional
from django.db.models import QuerySet

from apps.users.models import User

from .models import Submission, Answer


def submission_base_queryset(user: Optional[User] = None) -> QuerySet:
    """
    Base queryset for submissions with common prefetches.
    Args:
        user: Optional user to filter by
    Returns:
        QuerySet with select_related and prefetch_related applied
    """
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


def get_submission_by_id(pk: int, user: Optional[User] = None) -> Optional[Submission]:
    """
    Get a submission by ID with related data.
    Args:
        pk: Submission primary key
        user: Optional user to verify ownership
    Returns:
        Submission instance or None
    """
    return submission_base_queryset(user=user).filter(pk=pk).first()


def get_in_progress_submission(
    task_assignment_id: int,
    quiz_id: int
) -> Optional[Submission]:
    """
    Get an in-progress submission for a task assignment and quiz.
    """
    return Submission.objects.filter(
        task_assignment_id=task_assignment_id,
        quiz_id=quiz_id,
        status='IN_PROGRESS'
    ).first()


def get_submitted_submission(
    task_assignment_id: int,
    quiz_id: int
) -> Optional[Submission]:
    """
    Get an existing submitted submission for a task assignment and quiz.
    """
    return Submission.objects.filter(
        task_assignment_id=task_assignment_id,
        quiz_id=quiz_id,
        status__in=['SUBMITTED', 'GRADING', 'GRADED']
    ).first()


def count_submission_attempts(task_assignment_id: int, quiz_id: int) -> int:
    """
    Count the number of submission attempts for a task assignment and quiz.
    """
    return Submission.objects.filter(
        task_assignment_id=task_assignment_id,
        quiz_id=quiz_id
    ).count()


def get_answer_by_submission_and_question(
    submission_id: int,
    question_id: int
) -> Optional[Answer]:
    """
    Get an answer by submission and question ID.
    """
    return Answer.objects.select_related('question').filter(
        submission_id=submission_id,
        question_id=question_id
    ).first()


def list_objective_answers(submission_id: int) -> QuerySet:
    """
    List all objective question answers for a submission.
    """
    return Answer.objects.filter(
        submission_id=submission_id,
        question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
    ).select_related('question')
