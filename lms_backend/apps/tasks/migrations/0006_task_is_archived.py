from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0005_created_by_admin'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='is_archived',
            field=models.BooleanField(default=False, db_index=True, verbose_name='已从任务列表移除'),
        ),
    ]
