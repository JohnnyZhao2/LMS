from django.db import migrations
from django.utils import timezone


def deactivate_student_role_overrides(apps, schema_editor):
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')
    now = timezone.now()

    (
        UserPermissionOverride.objects
        .filter(applies_to_role='STUDENT', is_active=True)
        .update(
            is_active=False,
            revoked_at=now,
            revoked_reason='学员角色不再参与用户权限覆盖生效',
            updated_at=now,
        )
    )


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0005_normalize_non_scope_overrides'),
    ]

    operations = [
        migrations.RunPython(deactivate_student_role_overrides, migrations.RunPython.noop),
    ]
