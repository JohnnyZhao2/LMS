# 模型侧一致性校验见 submissions.models.Submission.clean。
# 新环境 schema 已在 0004 完成；本迁移是幂等安全网，并强制旧 0004 环境真正执行非空 DDL。

from django.db import migrations, models
import django.db.models.deletion


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


def backfill_or_delete_null_task_quiz(apps, schema_editor):
    """补齐 task_quiz 为空的历史提交；键冲突时按状态优先级保留更完整的一条。"""
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
    """修复或删除与模型 clean() 不一致的历史答卷。"""
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


def _column_is_nullable(schema_editor, table: str, column: str) -> bool:
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        if connection.vendor == 'mysql':
            cursor.execute(
                """
                SELECT IS_NULLABLE
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = %s
                  AND COLUMN_NAME = %s
                """,
                [table, column],
            )
            row = cursor.fetchone()
            return bool(row and row[0] == 'YES')

        if connection.vendor == 'postgresql':
            cursor.execute(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
                """,
                [table, column],
            )
            row = cursor.fetchone()
            return bool(row and row[0] == 'YES')

        if connection.vendor == 'sqlite':
            cursor.execute(f'PRAGMA table_info({table})')
            col = next((item for item in cursor.fetchall() if item[1] == column), None)
            return bool(col and not col[3])

    return False


def ensure_task_quiz_not_null(apps, schema_editor):
    """按真实库结构强制 task_quiz_id 非空。"""
    table = 'lms_submission'
    column = 'task_quiz_id'
    if not _column_is_nullable(schema_editor, table, column):
        return

    Submission = apps.get_model('submissions', 'Submission')
    TaskQuiz = apps.get_model('tasks', 'TaskQuiz')

    old_field = models.ForeignKey(
        TaskQuiz,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='submissions',
        verbose_name='任务试卷',
    )
    old_field.set_attributes_from_name('task_quiz')
    old_field.model = Submission

    new_field = models.ForeignKey(
        TaskQuiz,
        on_delete=models.PROTECT,
        null=False,
        blank=False,
        related_name='submissions',
        verbose_name='任务试卷',
    )
    new_field.set_attributes_from_name('task_quiz')
    new_field.model = Submission

    schema_editor.alter_field(Submission, old_field, new_field)


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0004_uniq_submission_assignment_task_quiz_attempt'),
        ('tasks', '0003_knowledgelearningprogress_started_at'),
    ]

    operations = [
        migrations.RunPython(backfill_or_delete_null_task_quiz, migrations.RunPython.noop),
        migrations.RunPython(fix_or_delete_inconsistent_submissions, migrations.RunPython.noop),
        migrations.RunPython(delete_duplicate_submissions, migrations.RunPython.noop),
        migrations.RunPython(renumber_attempt_numbers, migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='submission',
                    name='task_quiz',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='submissions',
                        to='tasks.taskquiz',
                        verbose_name='任务试卷',
                    ),
                ),
            ],
            database_operations=[
                migrations.RunPython(ensure_task_quiz_not_null, migrations.RunPython.noop),
            ],
        ),
    ]
