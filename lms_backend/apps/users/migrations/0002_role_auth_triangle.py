from django.db import migrations, models


ROLE_CHOICES = [
    ('STUDENT', '学员'),
    ('MENTOR', '导师'),
    ('DEPT', '室组'),
    ('GLOBAL', '全局'),
]


def migrate_role_triangle_forward(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    UserRole = apps.get_model('users', 'UserRole')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')

    UserPermissionOverride.objects.filter(applies_to_role='DEPT_MANAGER').update(applies_to_role='DEPT')
    UserPermissionOverride.objects.filter(applies_to_role='ADMIN').update(applies_to_role='GLOBAL')
    UserPermissionOverride.objects.filter(applies_to_role='TEAM_MANAGER').update(applies_to_role='')

    team_manager_role = Role.objects.filter(code='TEAM_MANAGER').first()
    if team_manager_role:
        UserRole.objects.filter(role_id=team_manager_role.id).delete()
        Role.objects.filter(code='TEAM_MANAGER').delete()

    Role.objects.filter(code='DEPT_MANAGER').update(
        code='DEPT',
        name='室组',
        description='本室范围，可多人',
    )
    Role.objects.filter(code='ADMIN').update(
        code='GLOBAL',
        name='全局',
        description='全平台管理',
    )


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
        ('authorization', '0030_drop_user_scope_group_override'),
    ]

    operations = [
        migrations.RunPython(migrate_role_triangle_forward, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='role',
            name='code',
            field=models.CharField(
                choices=ROLE_CHOICES,
                max_length=20,
                unique=True,
                verbose_name='角色代码',
            ),
        ),
    ]
