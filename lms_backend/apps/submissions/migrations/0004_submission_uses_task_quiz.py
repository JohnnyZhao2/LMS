import django.db.models.deletion
from django.db import migrations, models


def backfill_submission_task_quiz(apps, schema_editor):
    Submission = apps.get_model('submissions', 'Submission')
    Answer = apps.get_model('submissions', 'Answer')
    TaskQuiz = apps.get_model('tasks', 'TaskQuiz')
    QuizRevisionQuestion = apps.get_model('quizzes', 'QuizRevisionQuestion')

    missing = list(
        Submission.objects.filter(task_quiz_id__isnull=True).select_related(
            'task_assignment',
            'quiz',
        )
    )
    if not missing:
        return

    unresolved_ids = []
    to_update = []

    for submission in missing:
        task_id = submission.task_assignment.task_id
        matched_id = None

        # 1. 优先通过已挂接到 TaskQuiz 的 Answer -> QuizRevisionQuestion 精确反推
        answer_tq_ids = list(
            Answer.objects.filter(
                submission_id=submission.id,
                question__task_quiz__task_id=task_id,
            )
            .values_list('question__task_quiz_id', flat=True)
            .distinct()
        )
        if len(answer_tq_ids) == 1:
            matched_id = answer_tq_ids[0]

        # 2. 通过该快照卷下的 QuizRevisionQuestion 反推同一任务内的 TaskQuiz
        if matched_id is None and submission.quiz_id is not None:
            revision_tq_ids = list(
                QuizRevisionQuestion.objects.filter(
                    quiz_id=submission.quiz_id,
                    task_quiz__task_id=task_id,
                )
                .values_list('task_quiz_id', flat=True)
                .distinct()
            )
            if len(revision_tq_ids) == 1:
                matched_id = revision_tq_ids[0]

        # 3. 按 (task_id, source_quiz_id) / 元信息匹配
        if matched_id is None and submission.quiz_id is not None:
            revision = submission.quiz
            base_qs = TaskQuiz.objects.filter(task_id=task_id)
            if revision.source_quiz_id is not None:
                source_ids = list(
                    base_qs.filter(source_quiz_id=revision.source_quiz_id).values_list('id', flat=True)
                )
                if len(source_ids) == 1:
                    matched_id = source_ids[0]
                elif len(source_ids) > 1:
                    narrowed_ids = list(
                        base_qs.filter(
                            id__in=source_ids,
                            title=revision.title,
                            allow_retry=revision.allow_retry,
                            duration=revision.duration,
                            pass_score=revision.pass_score,
                        ).values_list('id', flat=True)
                    )
                    if len(narrowed_ids) == 1:
                        matched_id = narrowed_ids[0]
            if matched_id is None:
                meta_ids = list(
                    base_qs.filter(
                        title=revision.title,
                        allow_retry=revision.allow_retry,
                        duration=revision.duration,
                        pass_score=revision.pass_score,
                    ).values_list('id', flat=True)
                )
                if len(meta_ids) == 1:
                    matched_id = meta_ids[0]

        if matched_id is None:
            unresolved_ids.append(submission.id)
        else:
            submission.task_quiz_id = matched_id
            to_update.append(submission)

    if unresolved_ids:
        raise RuntimeError(
            f'存在无法自动回填 task_quiz 的 Submission 记录（ids={unresolved_ids}），'
            '已中止迁移，保留原 quiz 列以免丢失引用。'
        )

    if to_update:
        Submission.objects.bulk_update(to_update, ['task_quiz'], batch_size=500)

    remaining_null_ids = list(
        Submission.objects.filter(task_quiz_id__isnull=True).values_list('id', flat=True)
    )
    if remaining_null_ids:
        raise RuntimeError(
            f'回填后仍存在 task_quiz 为空的 Submission 记录（ids={remaining_null_ids}），已中止迁移。'
        )


class Migration(migrations.Migration):
    dependencies = [
        ('submissions', '0003_initial'),
        ('tasks', '0007_fold_quiz_revision_into_task_quiz'),
    ]

    operations = [
        migrations.RunPython(backfill_submission_task_quiz, migrations.RunPython.noop),
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
        migrations.RemoveField(model_name='submission', name='quiz'),
    ]
