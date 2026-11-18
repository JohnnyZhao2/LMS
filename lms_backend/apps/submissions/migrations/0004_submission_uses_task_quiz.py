import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('submissions', '0003_initial'),
        ('tasks', '0007_fold_quiz_revision_into_task_quiz'),
    ]

    operations = [
        migrations.RemoveField(model_name='submission', name='quiz'),
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
    ]
