from django.db import migrations, models


CREATED_ROLE_CHOICES = [
    ('GLOBAL', '全局'),
    ('MENTOR', '导师'),
    ('DEPT', '室组'),
    ('STUDENT', '学员'),
]


def migrate_task_created_role_forward(apps, schema_editor):
    Task = apps.get_model('tasks', 'Task')
    Task.objects.filter(created_role='ADMIN').update(created_role='GLOBAL')
    Task.objects.filter(created_role='DEPT_MANAGER').update(created_role='DEPT')
    Task.objects.filter(created_role='TEAM_MANAGER').update(created_role='GLOBAL')


class Migration(migrations.Migration):
    dependencies = [
        ('tasks', '0003_knowledgelearningprogress_started_at'),
        ('users', '0002_role_auth_triangle'),
    ]

    operations = [
        migrations.RunPython(migrate_task_created_role_forward, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='task',
            name='created_role',
            field=models.CharField(
                choices=CREATED_ROLE_CHOICES,
                db_index=True,
                default='GLOBAL',
                max_length=20,
                verbose_name='创建时角色',
            ),
        ),
    ]
