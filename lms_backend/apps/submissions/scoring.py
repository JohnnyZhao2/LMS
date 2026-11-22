from datetime import datetime, timezone as dt_timezone
from decimal import Decimal
from typing import Optional

from django.db import models


ASSIGNMENT_SCORE_STATUSES = ('SUBMITTED', 'GRADED')
_MIN_DT = datetime(1970, 1, 1, tzinfo=dt_timezone.utc)


def submission_recency_key(status: str, attempt_number: int, submitted_at, sub_id: int) -> tuple:
    """统一的答卷新旧排序键：已交卷优先于进行中，再按尝试次数、交卷时间、ID 递增。"""
    return (0 if status == 'IN_PROGRESS' else 1, attempt_number, submitted_at or _MIN_DT, sub_id)


def calculate_submission_scores(
    submission,
) -> tuple[Optional[Decimal], Optional[Decimal], Decimal]:
    agg = submission.answers.aggregate(
        obj_count=models.Count('id', filter=~models.Q(question__question_type='SHORT_ANSWER')),
        obj_score=models.Sum('obtained_score', filter=~models.Q(question__question_type='SHORT_ANSWER')),
        subj_count=models.Count('id', filter=models.Q(question__question_type='SHORT_ANSWER')),
        subj_score=models.Sum('obtained_score', filter=models.Q(question__question_type='SHORT_ANSWER')),
    )
    has_objective = bool(agg['obj_count'])
    has_subjective = bool(agg['subj_count'])
    objective_score = (agg['obj_score'] or Decimal('0')) if has_objective else None
    subjective_score = (
        (agg['subj_score'] or Decimal('0'))
        if has_subjective and submission.status != 'GRADING'
        else None
    )
    obtained_score = (objective_score or Decimal('0')) + (subjective_score or Decimal('0'))
    return objective_score, subjective_score, obtained_score


def refresh_submission_obtained_score(submission, *, save: bool = True) -> Decimal:
    (
        submission.objective_score,
        submission.subjective_score,
        submission.obtained_score,
    ) = calculate_submission_scores(submission)
    if save:
        submission.save(
            update_fields=['objective_score', 'subjective_score', 'obtained_score', 'updated_at']
        )
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
