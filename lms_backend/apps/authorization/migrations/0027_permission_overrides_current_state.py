from django.db import migrations, models
from django.db.models import Count, Max, Q


def prune_permission_override_history(apps, schema_editor):
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')

    UserPermissionOverride.objects.filter(
        Q(is_active=False) | Q(revoked_at__isnull=False)
    ).delete()

    duplicate_groups = (
        UserPermissionOverride.objects
        .values('user_id', 'permission_id', 'applies_to_role')
        .annotate(row_count=Count('id'), keep_id=Max('id'))
        .filter(row_count__gt=1)
    )
    for group in duplicate_groups.iterator():
        UserPermissionOverride.objects.filter(
            user_id=group['user_id'],
            permission_id=group['permission_id'],
            applies_to_role=group['applies_to_role'],
        ).exclude(id=group['keep_id']).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0026_scope_group_overrides_current_state'),
    ]

    operations = [
        migrations.RunPython(prune_permission_override_history, migrations.RunPython.noop),
        migrations.RemoveIndex(
            model_name='userpermissionoverride',
            name='user_perm_override_u_p_a_idx',
        ),
        migrations.RemoveField(
            model_name='userpermissionoverride',
            name='is_active',
        ),
        migrations.RemoveField(
            model_name='userpermissionoverride',
            name='revoked_at',
        ),
        migrations.RemoveField(
            model_name='userpermissionoverride',
            name='revoked_by',
        ),
        migrations.RemoveField(
            model_name='userpermissionoverride',
            name='revoked_reason',
        ),
        migrations.AddIndex(
            model_name='userpermissionoverride',
            index=models.Index(fields=['user', 'permission'], name='user_perm_override_u_p_idx'),
        ),
    ]
