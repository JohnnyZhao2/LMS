from decimal import Decimal
from typing import Optional

from django.db import models

from .models import Submission


def calculate_submission_score(submission) -> Decimal:
    return submission.answers.aggregate(
        total=models.Sum('obtained_score'),
    )['total'] or Decimal('0')


def refresh_submission_score(submission, *, save: bool = True) -> Decimal:
    submission.obtained_score = calculate_submission_score(submission)
    if save:
        submission.save(update_fields=['obtained_score'])
    return submission.obtained_score


def calculate_assignment_score(assignment) -> Optional[Decimal]:
    return assignment.submissions.filter(
        status__in=Submission.SCORED_STATUSES,
        obtained_score__isnull=False,
    ).aggregate(
        max_score=models.Max('obtained_score'),
    )['max_score']


def refresh_assignment_score(assignment, *, save: bool = True) -> Optional[Decimal]:
    assignment.score = calculate_assignment_score(assignment)
    if save:
        assignment.save(update_fields=['score'])
    return assignment.score
