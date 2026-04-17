from django.db import migrations


ACTIVITY_LOG_PERMISSION_CODES = (
    'activity_log.view',
    'activity_log.policy.update',
)


def move_activity_log_permissions_to_log_management(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    Permission.objects.filter(code__in=ACTIVITY_LOG_PERMISSION_CODES).update(module='log_management')


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0025_delete_scope_group_rule'),
    ]

    operations = [
        migrations.RunPython(
            move_activity_log_permissions_to_log_management,
            migrations.RunPython.noop,
        ),
    ]
