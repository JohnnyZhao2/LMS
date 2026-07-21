from django.db import migrations, models
from django.db.models import Count, Max, Q


def prune_scope_group_override_history(apps, schema_editor):
    UserScopeGroupOverride = apps.get_model('authorization', 'UserScopeGroupOverride')

    UserScopeGroupOverride.objects.filter(
        Q(is_active=False) | Q(revoked_at__isnull=False)
    ).delete()

    duplicate_groups = (
        UserScopeGroupOverride.objects
        .values('user_id', 'scope_group_key', 'effect', 'applies_to_role', 'scope_type')
        .annotate(row_count=Count('id'), keep_id=Max('id'))
        .filter(row_count__gt=1)
    )
    for group in duplicate_groups.iterator():
        UserScopeGroupOverride.objects.filter(
            user_id=group['user_id'],
            scope_group_key=group['scope_group_key'],
            effect=group['effect'],
            applies_to_role=group['applies_to_role'],
            scope_type=group['scope_type'],
        ).exclude(id=group['keep_id']).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0025_rename_task_assignment_scope_group'),
    ]

    operations = [
        migrations.RunPython(prune_scope_group_override_history, migrations.RunPython.noop),
        migrations.RemoveIndex(
            model_name='userscopegroupoverride',
            name='user_scope_group_u_g_a_idx',
        ),
        migrations.RemoveField(
            model_name='userscopegroupoverride',
            name='is_active',
        ),
        migrations.RemoveField(
            model_name='userscopegroupoverride',
            name='revoked_at',
        ),
        migrations.RemoveField(
            model_name='userscopegroupoverride',
            name='revoked_by',
        ),
        migrations.RemoveField(
            model_name='userscopegroupoverride',
            name='revoked_reason',
        ),
        migrations.AddIndex(
            model_name='userscopegroupoverride',
            index=models.Index(fields=['user', 'scope_group_key'], name='user_scope_group_u_g_idx'),
        ),
    ]
