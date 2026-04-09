"""Clean up non-admin config-module permissions."""
from django.db import migrations
from django.db.models import Q


CONFIG_MODULE = 'config'
ADMIN_ROLE_CODE = 'ADMIN'


def cleanup_non_admin_config_permissions(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')

    config_permission_ids = list(
        Permission.objects.filter(module=CONFIG_MODULE).values_list('id', flat=True)
    )
    if not config_permission_ids:
        return

    RolePermission.objects.filter(
        permission_id__in=config_permission_ids,
    ).exclude(
        role__code=ADMIN_ROLE_CODE,
    ).delete()

    UserPermissionOverride.objects.filter(
        permission_id__in=config_permission_ids,
    ).filter(
        Q(applies_to_role__isnull=True)
        | Q(applies_to_role='')
        | ~Q(applies_to_role=ADMIN_ROLE_CODE)
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0010_merge_config_module'),
    ]

    operations = [
        migrations.RunPython(cleanup_non_admin_config_permissions, migrations.RunPython.noop),
    ]
