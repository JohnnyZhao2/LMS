from django.db import migrations, models
from django.db.models import Count


def deduplicate_attempt_numbers(apps, schema_editor):
    Submission = apps.get_model('submissions', 'Submission')
    dup_groups = (
        Submission.objects.values('task_assignment_id', 'task_quiz_id', 'attempt_number')
        .annotate(cnt=Count('id'))
        .filter(cnt__gt=1)
        .values_list('task_assignment_id', 'task_quiz_id')
        .distinct()
    )
    for assignment_id, task_quiz_id in dup_groups:
        rows = list(
            Submission.objects.filter(
                task_assignment_id=assignment_id,
                task_quiz_id=task_quiz_id,
            ).order_by('attempt_number', 'created_at', 'id')
        )
        max_num = max(row.attempt_number for row in rows)
        seen = set()
        to_update = []
        for row in rows:
            if row.attempt_number in seen:
                max_num += 1
                row.attempt_number = max_num
                to_update.append(row)
            seen.add(row.attempt_number)
        if to_update:
            Submission.objects.bulk_update(to_update, ['attempt_number'])


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0006_submission_answer_indexes'),
    ]

    operations = [
        migrations.RunPython(deduplicate_attempt_numbers, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='submission',
            constraint=models.UniqueConstraint(
                fields=('task_assignment', 'task_quiz', 'attempt_number'),
                name='uniq_submission_assignment_quiz_attempt',
            ),
        ),
    ]
