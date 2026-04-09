from django.db import migrations


PURGED_PERMISSION_CODES = [
    'analytics.view',
]


def purge_dashboard_analytics_artifacts(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')
    PermissionScopeRule = apps.get_model('authorization', 'PermissionScopeRule')

    RolePermission.objects.filter(permission__code__in=PURGED_PERMISSION_CODES).delete()
    UserPermissionOverride.objects.filter(permission__code__in=PURGED_PERMISSION_CODES).delete()
    PermissionScopeRule.objects.filter(permission__code__in=PURGED_PERMISSION_CODES).delete()

    Permission.objects.filter(code__in=PURGED_PERMISSION_CODES).delete()
    Permission.objects.filter(module='analytics').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0019_remove_team_manager_dashboard_permissions'),
    ]

    operations = [
        migrations.RunPython(purge_dashboard_analytics_artifacts, migrations.RunPython.noop),
    ]
