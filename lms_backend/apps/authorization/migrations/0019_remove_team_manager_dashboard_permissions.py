from django.db import migrations


REMOVED_PERMISSION_CODES = [
    'analytics.view',
]


def remove_team_manager_dashboard_permissions(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    Permission.objects.filter(code__in=REMOVED_PERMISSION_CODES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0018_merge_user_view_scope_permissions'),
    ]

    operations = [
        migrations.RunPython(remove_team_manager_dashboard_permissions, migrations.RunPython.noop),
    ]
