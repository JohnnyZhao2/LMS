from decimal import Decimal

from django.core.exceptions import ValidationError
from apps.tasks.assignment_workflow import sync_assignment_completion_status

from .models import Submission
from .scoring import refresh_assignment_score, refresh_submission_obtained_score


def finalize_submission_grading(submission: Submission) -> Submission:
    if submission.status != 'GRADING':
        raise ValidationError('只能完成待评分状态的记录')
    if not submission.all_subjective_graded:
        raise ValidationError('还有未评分的主观题')

    refresh_submission_obtained_score(submission)
    submission.status = 'GRADED'
    submission.save(update_fields=['status'])
    refresh_assignment_score(submission.task_assignment, Submission)
    sync_assignment_completion_status(submission.task_assignment)
    return submission


def refresh_submission_scores(submission: Submission) -> None:
    refresh_submission_obtained_score(submission)
    refresh_assignment_score(submission.task_assignment, Submission)


def grade_subjective_answer(answer, grader, score, comment=''):
    if answer.is_objective:
        raise ValidationError('客观题不需要人工评分')

    score_decimal = Decimal(str(score))
    if score_decimal < 0 or score_decimal > answer.max_score:
        raise ValidationError(f'分数必须在 0 到 {answer.max_score} 之间')

    answer.apply_manual_grade(grader=grader, score=score_decimal, comment=comment)

    submission = answer.submission
    if submission.status == 'GRADING':
        if submission.all_subjective_graded:
            finalize_submission_grading(submission)
    elif submission.status in ['SUBMITTED', 'GRADED']:
        refresh_submission_scores(submission)

    return answer
