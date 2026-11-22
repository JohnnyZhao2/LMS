"""阅卷流程。

`SubmissionService` 负责学员作答；这里负责人工评分后的状态收口和分数刷新。
"""

from decimal import Decimal

from django.db import transaction

from apps.tasks.assignment_workflow import sync_assignment_completion_status
from apps.tasks.models import TaskAssignment
from core.exceptions import BusinessError, ErrorCodes

from .models import Submission
from .scoring import refresh_assignment_score, refresh_submission_obtained_score


def finalize_submission_grading(submission: Submission) -> Submission:
    """完成一份待评分答卷。

    所有主观题必须先有评分，答卷才能从 GRADING 进入 GRADED。
    """
    if submission.status != 'GRADING':
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='只能完成待评分状态的记录',
        )
    if not submission.all_subjective_graded:
        raise BusinessError(
            code=ErrorCodes.VALIDATION_ERROR,
            message='还有未评分的主观题',
        )

    submission.status = 'GRADED'
    refresh_submission_obtained_score(submission, save=False)
    submission.save(
        update_fields=['status', 'objective_score', 'subjective_score', 'obtained_score', 'updated_at']
    )
    refresh_assignment_score(submission.task_assignment, Submission)
    sync_assignment_completion_status(submission.task_assignment)
    return submission


def refresh_submission_scores(submission: Submission) -> None:
    refresh_submission_obtained_score(submission)
    refresh_assignment_score(submission.task_assignment, Submission)


def grade_subjective_answer(answer, grader, score, comment=''):
    """给单道主观题评分，并在必要时自动完成整份答卷。"""
    # 先在事务外查出 task_assignment_id，保证进入事务后第一条 SQL 就是加锁，
    # 避免在加锁前建立普通读快照导致读到旧状态。
    task_assignment_id = (
        Submission.objects.filter(pk=answer.submission_id)
        .values_list('task_assignment_id', flat=True)
        .first()
    )
    if task_assignment_id is None:
        raise BusinessError(
            code=ErrorCodes.RESOURCE_NOT_FOUND,
            message='答题记录不存在',
        )

    # 与答题侧保持一致：先锁 TaskAssignment，再锁 Submission，避免并发死锁。
    with transaction.atomic():
        TaskAssignment.objects.select_for_update().get(pk=task_assignment_id)
        submission = Submission.objects.select_for_update(of=('self',)).select_related(
            'task_assignment__assignee',
            'task_quiz',
        ).get(pk=answer.submission_id)
        if submission.status not in ['SUBMITTED', 'GRADING', 'GRADED']:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='答卷尚未提交，不能评分',
            )
        answer.refresh_from_db(
            fields=[
                'text_answer',
                'is_marked',
                'is_correct',
                'obtained_score',
                'graded_by',
                'graded_at',
                'comment',
            ]
        )
        answer.submission = submission
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

        if submission.status == 'GRADING':
            if submission.all_subjective_graded:
                finalize_submission_grading(submission)
        elif submission.status in ['SUBMITTED', 'GRADED']:
            refresh_submission_scores(submission)

    return answer
