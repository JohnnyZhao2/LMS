"""Move business roles to Django auth groups and drop duplicate role tables."""

from django.db import migrations


def copy_roles_to_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    User = apps.get_model('users', 'User')
    UserRole = apps.get_model('users', 'UserRole')
    UserGroup = User.groups.through

    for role_code in ('STUDENT', 'MENTOR', 'DEPT_MANAGER', 'ADMIN'):
        Group.objects.get_or_create(name=role_code)

    group_id_by_role_id = {}
    for role in apps.get_model('users', 'Role').objects.all():
        group, _ = Group.objects.get_or_create(name=role.code)
        group_id_by_role_id[role.id] = group.id

    UserGroup.objects.bulk_create(
        [
            UserGroup(user_id=user_id, group_id=group_id_by_role_id[role_id])
            for user_id, role_id in UserRole.objects.values_list('user_id', 'role_id')
            if role_id in group_id_by_role_id
        ],
        batch_size=500,
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='user',
            options={
                'ordering': ['employee_id'],
                'permissions': [
                    ('activate_user', '启停账号'),
                    ('assign_user_role', '分配用户角色'),
                    ('view_user_permission', '查看用户权限'),
                    ('change_user_permission', '更新用户权限'),
                    ('change_user_avatar', '修改他人头像'),
                ],
            },
        ),
        migrations.RunPython(copy_roles_to_groups, migrations.RunPython.noop),
        migrations.RemoveField(model_name='user', name='roles'),
        migrations.DeleteModel(name='UserRole'),
        migrations.DeleteModel(name='Role'),
    ]
