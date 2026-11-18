import django.db.models.deletion
from django.db import migrations, models


def copy_revision_header(apps, schema_editor):
    TaskQuiz = apps.get_model('tasks', 'TaskQuiz')
    QuizRevision = apps.get_model('quizzes', 'QuizRevision')
    for task_quiz in TaskQuiz.objects.all():
        revision = QuizRevision.objects.get(id=task_quiz.quiz_id)
        task_quiz.title = revision.title
        task_quiz.allow_retry = revision.allow_retry
        task_quiz.duration = revision.duration
        task_quiz.pass_score = revision.pass_score
        task_quiz.save(update_fields=['title', 'allow_retry', 'duration', 'pass_score'])


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0006_task_is_archived'),
        ('quizzes', '0006_attach_questions_to_task_quiz'),
    ]

    operations = [
        migrations.AddField(
            model_name='taskquiz',
            name='title',
            field=models.CharField(default='', max_length=200, verbose_name='试卷名称'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='taskquiz',
            name='allow_retry',
            field=models.BooleanField(default=False, verbose_name='允许重做'),
        ),
        migrations.AddField(
            model_name='taskquiz',
            name='duration',
            field=models.PositiveIntegerField(default=60, verbose_name='参考时间(分钟)'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='taskquiz',
            name='pass_score',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5, verbose_name='参考分数'),
            preserve_default=False,
        ),
        migrations.RunPython(copy_revision_header, migrations.RunPython.noop),
        migrations.RemoveField(model_name='taskquiz', name='quiz'),
        migrations.RemoveField(model_name='task', name='quizzes'),
    ]
