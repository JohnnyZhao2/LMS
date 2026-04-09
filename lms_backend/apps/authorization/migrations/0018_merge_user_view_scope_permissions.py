from django.db import migrations


LEGACY_PERMISSION_CODES = [
    'user.mentee.view',
    'user.department_member.view',
]

USER_VIEW_SCOPE_RULES = [
    ('MENTOR', 'MENTEES'),
    ('DEPT_MANAGER', 'DEPARTMENT'),
    ('ADMIN', 'ALL'),
]


def merge_user_view_scope_permissions(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    PermissionScopeRule = apps.get_model('authorization', 'PermissionScopeRule')

    user_view_permission = Permission.objects.filter(code='user.view').first()
    if user_view_permission is not None:
        desired_keys = set()
        for role_code, scope_type in USER_VIEW_SCOPE_RULES:
            desired_keys.add((role_code, scope_type))
            PermissionScopeRule.objects.update_or_create(
                permission=user_view_permission,
                role_code=role_code,
                scope_type=scope_type,
                defaults={'is_active': True},
            )

        stale_rules = PermissionScopeRule.objects.filter(permission=user_view_permission)
        for rule in stale_rules:
            if (rule.role_code, rule.scope_type) not in desired_keys:
                rule.delete()

    Permission.objects.filter(code__in=LEGACY_PERMISSION_CODES).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0017_sync_permission_scope_rule_baselines'),
    ]

    operations = [
        migrations.RunPython(merge_user_view_scope_permissions, migrations.RunPython.noop),
    ]
