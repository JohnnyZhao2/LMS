from decimal import Decimal
from typing import Optional

from django.db import models


ASSIGNMENT_SCORE_STATUSES = ('SUBMITTED', 'GRADED')


def calculate_submission_obtained_score(submission) -> Decimal:
    return submission.answers.aggregate(
        total=models.Sum('obtained_score'),
    )['total'] or Decimal('0')


def refresh_submission_obtained_score(submission, *, save: bool = True) -> Decimal:
    submission.obtained_score = calculate_submission_obtained_score(submission)
    if save:
        submission.save(update_fields=['obtained_score'])
    return submission.obtained_score


def calculate_assignment_score(assignment, submission_model) -> Optional[Decimal]:
    return submission_model.objects.filter(
        task_assignment_id=assignment.id,
        status__in=ASSIGNMENT_SCORE_STATUSES,
        obtained_score__isnull=False,
    ).aggregate(
        max_score=models.Max('obtained_score'),
    )['max_score']


def refresh_assignment_score(assignment, submission_model, *, save: bool = True) -> Optional[Decimal]:
    assignment.score = calculate_assignment_score(assignment, submission_model)
    if save:
        assignment.save(update_fields=['score'])
    return assignment.score
