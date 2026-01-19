# Generated migration to remove redundant version fields
# FK already points to specific version, no need for separate uuid/version_number

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0002_task_resource_version_nullable'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='taskknowledge',
            name='resource_uuid',
        ),
        migrations.RemoveField(
            model_name='taskknowledge',
            name='version_number',
        ),
        migrations.RemoveField(
            model_name='taskquiz',
            name='resource_uuid',
        ),
        migrations.RemoveField(
            model_name='taskquiz',
            name='version_number',
        ),
    ]
