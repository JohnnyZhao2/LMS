# 独立数据迁移：已应用 0005 的环境不会重跑改写后的 0005，此处补做关联清理。

from django.db import migrations


_STATUS_RANK = {
    'GRADED': 4,
    'GRADING': 3,
    'SUBMITTED': 2,
    'IN_PROGRESS': 1,
}

_TEMP_ATTEMPT_BASE = 1_000_000_000


def _rank_key(submission):
    return (
        _STATUS_RANK.get(submission.status, 0),
        submission.obtained_score if submission.obtained_score is not None else -1,
        submission.submitted_at is not None,
        submission.submitted_at or submission.created_at,
        submission.id,
    )


def _pick_best(submissions):
    return max(submissions, key=_rank_key)


def backfill_or_resolve_null_task_quiz(apps, schema_editor):
    """补齐残留 NULL task_quiz；键冲突时按状态优先级保留更完整的一条。"""
    Submission = apps.get_model('submissions', 'Submission')
    TaskAssignment = apps.get_model('tasks', 'TaskAssignment')
    TaskQuiz = apps.get_model('tasks', 'TaskQuiz')

    for submission in Submission.objects.filter(task_quiz_id__isnull=True).iterator():
        assignment = TaskAssignment.objects.filter(pk=submission.task_assignment_id).first()
        if assignment is None or not submission.quiz_id:
            submission.delete()
            continue

        matches = list(
            TaskQuiz.objects.filter(
                task_id=assignment.task_id,
                quiz_id=submission.quiz_id,
            ).order_by('id')[:2]
        )
        if len(matches) != 1:
            submission.delete()
            continue

        task_quiz = matches[0]
        conflicts = list(
            Submission.objects.filter(
                task_assignment_id=submission.task_assignment_id,
                task_quiz_id=task_quiz.id,
                attempt_number=submission.attempt_number,
            ).exclude(pk=submission.pk)
        )
        if conflicts:
            best = _pick_best(conflicts + [submission])
            if best.pk != submission.pk:
                submission.delete()
                continue
            for other in conflicts:
                other.delete()

        submission.task_quiz_id = task_quiz.id
        submission.save(update_fields=['task_quiz_id'])


def fix_or_delete_inconsistent_submissions(apps, schema_editor):
    """修复或删除与 Submission.clean() 不一致的历史答卷。

    - user != assignee：改为被分配人
    - task_quiz 不属于 assignment.task / quiz 不一致 / 关联缺失：删除
    """
    Submission = apps.get_model('submissions', 'Submission')
    TaskAssignment = apps.get_model('tasks', 'TaskAssignment')
    TaskQuiz = apps.get_model('tasks', 'TaskQuiz')

    for submission in Submission.objects.all().iterator():
        assignment = TaskAssignment.objects.filter(pk=submission.task_assignment_id).first()
        if assignment is None:
            submission.delete()
            continue

        if not submission.task_quiz_id or not submission.quiz_id or not submission.user_id:
            submission.delete()
            continue

        task_quiz = TaskQuiz.objects.filter(pk=submission.task_quiz_id).first()
        if task_quiz is None:
            submission.delete()
            continue

        if task_quiz.task_id != assignment.task_id:
            submission.delete()
            continue

        if submission.quiz_id != task_quiz.quiz_id:
            submission.delete()
            continue

        if submission.user_id != assignment.assignee_id:
            submission.user_id = assignment.assignee_id
            submission.save(update_fields=['user_id'])


def delete_duplicate_submissions(apps, schema_editor):
    Submission = apps.get_model('submissions', 'Submission')

    groups = {}
    for submission in Submission.objects.all().iterator():
        key = (
            submission.task_assignment_id,
            submission.task_quiz_id,
            submission.attempt_number,
        )
        groups.setdefault(key, []).append(submission)

    for submissions in groups.values():
        if len(submissions) <= 1:
            continue
        best = _pick_best(submissions)
        for duplicate in submissions:
            if duplicate.pk != best.pk:
                duplicate.delete()


def renumber_attempt_numbers(apps, schema_editor):
    Submission = apps.get_model('submissions', 'Submission')

    groups = {}
    for submission in Submission.objects.all().iterator():
        key = (submission.task_assignment_id, submission.task_quiz_id)
        groups.setdefault(key, []).append(submission)

    for submissions in groups.values():
        submissions.sort(key=lambda s: (s.attempt_number, s.created_at, s.id))
        if all(s.attempt_number == index for index, s in enumerate(submissions, start=1)):
            continue
        for offset, submission in enumerate(submissions):
            submission.attempt_number = _TEMP_ATTEMPT_BASE + offset
            submission.save(update_fields=['attempt_number'])
        for index, submission in enumerate(submissions, start=1):
            submission.attempt_number = index
            submission.save(update_fields=['attempt_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0005_submission_require_task_quiz_and_consistency'),
    ]

    operations = [
        migrations.RunPython(backfill_or_resolve_null_task_quiz, migrations.RunPython.noop),
        migrations.RunPython(fix_or_delete_inconsistent_submissions, migrations.RunPython.noop),
        migrations.RunPython(delete_duplicate_submissions, migrations.RunPython.noop),
        migrations.RunPython(renumber_attempt_numbers, migrations.RunPython.noop),
    ]
