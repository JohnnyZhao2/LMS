"""阅卷流程。

`SubmissionService` 负责学员作答；这里负责人工评分后的状态收口和分数刷新。
"""

from decimal import Decimal

from apps.tasks.progress import sync_assignment_completion_status
from core.exceptions import BusinessError, ErrorCodes

from .models import Submission
from .scoring import refresh_assignment_score, refresh_submission_score


def finalize_submission_grading(submission: Submission) -> Submission:
    """完成一份待评分答卷。

    所有主观题必须先有评分，答卷才能从 GRADING 进入 GRADED。
    """
    if submission.status != Submission.STATUS_GRADING:
        raise BusinessError(
            code=ErrorCodes.INVALID_OPERATION,
            message='只能完成待评分状态的记录',
        )
    if not submission.all_subjective_graded:
        raise BusinessError(
            code=ErrorCodes.INVALID_OPERATION,
            message='还有未评分的主观题',
        )

    refresh_submission_score(submission)
    submission.status = Submission.STATUS_GRADED
    submission.save(update_fields=['status'])
    refresh_assignment_score(submission.task_assignment)
    sync_assignment_completion_status(submission.task_assignment)
    return submission


def grade_subjective_answer(answer, grader, score, comment=''):
    """给单道主观题评分，并在必要时自动完成整份答卷。"""
    if answer.is_objective:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='客观题不需要人工评分',
        )

    score_decimal = Decimal(str(score))
    if score_decimal < 0 or score_decimal > answer.max_score:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message=f'分数必须在 0 到 {answer.max_score} 之间',
        )

    answer.apply_manual_grade(grader=grader, score=score_decimal, comment=comment)

    submission = answer.submission
    if submission.status == Submission.STATUS_GRADING:
        if submission.all_subjective_graded:
            finalize_submission_grading(submission)
    elif submission.status in (Submission.STATUS_SUBMITTED, Submission.STATUS_GRADED):
        refresh_submission_score(submission)
        refresh_assignment_score(submission.task_assignment)

    return answer
