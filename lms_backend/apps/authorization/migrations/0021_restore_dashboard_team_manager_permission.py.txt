from django.db import migrations


TEAM_MANAGER_DASHBOARD_PERMISSION = {
    'code': 'dashboard.team_manager.view',
    'name': '查看团队经理仪表盘',
    'module': 'dashboard',
    'description': '访问团队经理看板',
}


def restore_dashboard_team_manager_permission(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    Permission.objects.update_or_create(
        code=TEAM_MANAGER_DASHBOARD_PERMISSION['code'],
        defaults={
            'name': TEAM_MANAGER_DASHBOARD_PERMISSION['name'],
            'module': TEAM_MANAGER_DASHBOARD_PERMISSION['module'],
            'description': TEAM_MANAGER_DASHBOARD_PERMISSION['description'],
            'is_active': True,
        },
    )


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0020_purge_dashboard_analytics_artifacts'),
    ]

    operations = [
        migrations.RunPython(restore_dashboard_team_manager_permission, migrations.RunPython.noop),
    ]
