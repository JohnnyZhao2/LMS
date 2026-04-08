from django.db import migrations


SCOPE_RULE_ROWS = {
    'task.assign': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER', 'ALL:ADMIN'],
    'task.analytics.view': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER', 'ALL:ADMIN'],
    'spot_check.view': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER'],
    'spot_check.create': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER'],
    'analytics.view': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER', 'ALL:TEAM_MANAGER', 'ALL:ADMIN'],
    'user.mentee.view': ['MENTEES:MENTOR'],
    'user.department_member.view': ['DEPARTMENT:DEPT_MANAGER'],
}


def sync_scope_rules(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    PermissionScopeRule = apps.get_model('authorization', 'PermissionScopeRule')

    managed_permission_codes = list(SCOPE_RULE_ROWS.keys())
    desired_keys = set()

    for permission_code, entries in SCOPE_RULE_ROWS.items():
        permission = Permission.objects.filter(code=permission_code).first()
        if permission is None:
            continue
        for entry in entries:
            scope_type, role_code = entry.split(':', 1)
            desired_keys.add((permission.id, role_code, scope_type))
            PermissionScopeRule.objects.update_or_create(
                permission=permission,
                role_code=role_code,
                scope_type=scope_type,
                defaults={'is_active': True},
            )

    stale_rules = PermissionScopeRule.objects.filter(permission__code__in=managed_permission_codes)
    for scope_rule in stale_rules:
        cache_key = (scope_rule.permission_id, scope_rule.role_code, scope_rule.scope_type)
        if cache_key not in desired_keys:
            scope_rule.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0016_permission_scope_rule'),
    ]

    operations = [
        migrations.RunPython(sync_scope_rules, migrations.RunPython.noop),
    ]
