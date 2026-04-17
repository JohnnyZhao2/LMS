from django.db import migrations


def purge_soft_deleted_tasks(apps, schema_editor):
    Task = apps.get_model('tasks', 'Task')
    Submission = apps.get_model('submissions', 'Submission')

    soft_deleted_task_ids = list(
        Task.objects.filter(is_deleted=True).values_list('id', flat=True)
    )
    if not soft_deleted_task_ids:
        return

    Submission.objects.filter(
        task_assignment__task_id__in=soft_deleted_task_ids
    ).delete()
    Task.objects.filter(id__in=soft_deleted_task_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0006_alter_answer_unique_together_submission_task_quiz_and_more'),
        ('tasks', '0007_alter_knowledgelearningprogress_unique_together_and_more'),
    ]

    operations = [
        migrations.RunPython(
            purge_soft_deleted_tasks,
            migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='task',
            name='deleted_at',
        ),
        migrations.RemoveField(
            model_name='task',
            name='is_deleted',
        ),
    ]
