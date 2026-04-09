"""Merge authorization and activity_log modules into config module."""
from django.db import migrations


def merge_to_config_module(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    Permission.objects.filter(
        module__in=['authorization', 'activity_log']
    ).update(module='config')


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0009_rename_user_permission_codes'),
    ]

    operations = [
        migrations.RunPython(merge_to_config_module, migrations.RunPython.noop),
    ]
