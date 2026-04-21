from django.db import migrations


SCOPE_GROUP_BY_PERMISSION_CODE = {
    'user.view': 'user_scope',
    'task.assign': 'task_student_scope',
    'task.analytics.view': 'task_student_scope',
    'spot_check.view': 'spot_check_student_scope',
    'spot_check.create': 'spot_check_student_scope',
}


def migrate_scope_aware_user_overrides(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')
    UserScopeGroupOverride = apps.get_model('authorization', 'UserScopeGroupOverride')

    permission_code_by_id = dict(
        Permission.objects.filter(code__in=SCOPE_GROUP_BY_PERMISSION_CODE).values_list('id', 'code')
    )
    if not permission_code_by_id:
        return

    existing_keys = set(
        UserScopeGroupOverride.objects.values_list(
            'user_id',
            'scope_group_key',
            'effect',
            'applies_to_role',
            'scope_type',
        )
    )
    migrated_overrides = []
    for override in UserPermissionOverride.objects.filter(permission_id__in=permission_code_by_id):
        scope_group_key = SCOPE_GROUP_BY_PERMISSION_CODE[permission_code_by_id[override.permission_id]]
        identity = (
            override.user_id,
            scope_group_key,
            override.effect,
            override.applies_to_role,
            override.scope_type,
        )
        if identity in existing_keys:
            continue
        existing_keys.add(identity)
        migrated_overrides.append(
            UserScopeGroupOverride(
                user_id=override.user_id,
                scope_group_key=scope_group_key,
                effect=override.effect,
                applies_to_role=override.applies_to_role,
                scope_type=override.scope_type,
                scope_user_ids=override.scope_user_ids,
                reason=override.reason,
                expires_at=override.expires_at,
                is_active=override.is_active,
                granted_by_id=override.granted_by_id,
                revoked_by_id=override.revoked_by_id,
                revoked_at=override.revoked_at,
                revoked_reason=override.revoked_reason,
            )
        )

    if migrated_overrides:
        UserScopeGroupOverride.objects.bulk_create(migrated_overrides, batch_size=500)


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(migrate_scope_aware_user_overrides, migrations.RunPython.noop),
    ]
