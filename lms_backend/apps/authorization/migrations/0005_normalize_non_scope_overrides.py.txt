from django.db import migrations
from django.utils import timezone


SCOPE_AWARE_PERMISSION_CODES = {
    'spot_check.view',
    'spot_check.create',
    'task.assign',
    'task.analytics.view',
    'knowledge.view',
}


def normalize_non_scope_overrides(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')

    scope_aware_permission_ids = set(
        Permission.objects.filter(code__in=SCOPE_AWARE_PERMISSION_CODES).values_list('id', flat=True)
    )

    (
        UserPermissionOverride.objects
        .exclude(permission_id__in=scope_aware_permission_ids)
        .exclude(scope_type='ALL')
        .update(
            scope_type='ALL',
            scope_user_ids=[],
            updated_at=timezone.now(),
        )
    )


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0004_update_scope_type_labels'),
    ]

    operations = [
        migrations.RunPython(normalize_non_scope_overrides, migrations.RunPython.noop),
    ]
