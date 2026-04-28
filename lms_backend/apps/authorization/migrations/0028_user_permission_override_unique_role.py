from django.db import migrations, models


def normalize_user_permission_override_roles(apps, schema_editor):
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')

    keep_ids_by_key = {}
    duplicate_ids = []
    queryset = UserPermissionOverride.objects.order_by('-id').values(
        'id',
        'user_id',
        'permission_id',
        'applies_to_role',
    )

    for row in queryset.iterator():
        key = (
            row['user_id'],
            row['permission_id'],
            row['applies_to_role'] or '',
        )
        if key in keep_ids_by_key:
            duplicate_ids.append(row['id'])
        else:
            keep_ids_by_key[key] = row['id']

    if duplicate_ids:
        UserPermissionOverride.objects.filter(id__in=duplicate_ids).delete()

    UserPermissionOverride.objects.filter(applies_to_role__isnull=True).update(applies_to_role='')


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0027_permission_overrides_current_state'),
    ]

    operations = [
        migrations.RunPython(normalize_user_permission_override_roles, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='userpermissionoverride',
            name='applies_to_role',
            field=models.CharField(
                blank=True,
                choices=[
                    ('STUDENT', '学员'),
                    ('MENTOR', '导师'),
                    ('DEPT_MANAGER', '室经理'),
                    ('ADMIN', '管理员'),
                    ('TEAM_MANAGER', '团队经理'),
                ],
                db_index=True,
                default='',
                max_length=20,
                verbose_name='生效角色',
            ),
        ),
        migrations.AddConstraint(
            model_name='userpermissionoverride',
            constraint=models.UniqueConstraint(
                fields=('user', 'permission', 'applies_to_role'),
                name='uniq_user_perm_override_role',
            ),
        ),
    ]
