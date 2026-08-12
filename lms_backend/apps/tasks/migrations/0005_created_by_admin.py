from django.db import migrations, models


def copy_created_role(apps, schema_editor):
    Task = apps.get_model('tasks', 'Task')
    Task.objects.filter(created_role='ADMIN').update(created_by_admin=True)


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0004_task_auth_permissions'),
        ('users', '0002_use_django_groups'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='created_by_admin',
            field=models.BooleanField(db_index=True, default=False, verbose_name='管理员创建'),
        ),
        migrations.RunPython(copy_created_role, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='task',
            name='created_role',
        ),
    ]
