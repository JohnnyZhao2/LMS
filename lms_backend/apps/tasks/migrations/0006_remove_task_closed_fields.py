from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0005_task_created_role'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='task',
            name='closed_at',
        ),
        migrations.RemoveField(
            model_name='task',
            name='is_closed',
        ),
    ]
