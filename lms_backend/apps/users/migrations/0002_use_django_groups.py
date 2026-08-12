"""Copy management roles to Django auth Groups. Role tables dropped in 0003."""

from django.db import migrations


MANAGEMENT_ROLE_CODES = ('MENTOR', 'DEPT_MANAGER', 'ADMIN')


def copy_roles_to_groups(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    User = apps.get_model('users', 'User')
    UserGroup = User.groups.through
    UserRole = apps.get_model('users', 'UserRole')
    Role = apps.get_model('users', 'Role')
    Task = apps.get_model('tasks', 'Task')

    group_id_by_code = {}
    for role_code in MANAGEMENT_ROLE_CODES:
        group, _ = Group.objects.get_or_create(name=role_code)
        group_id_by_code[role_code] = group.id

    Task.objects.filter(created_role='TEAM_MANAGER').update(created_role='ADMIN')

    group_id_by_role_id = {
        role.id: group_id_by_code[role.code]
        for role in Role.objects.filter(code__in=MANAGEMENT_ROLE_CODES)
    }
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
        ('tasks', '0003_knowledgelearningprogress_started_at'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='user',
            options={
                'ordering': ['employee_id'],
                'permissions': [
                    ('assign_user_role', '分配用户角色'),
                    ('change_user_avatar', '修改他人头像'),
                    ('view_user_permission', '查看用户权限'),
                    ('change_user_permission', '更新用户权限'),
                ],
            },
        ),
        migrations.RunPython(copy_roles_to_groups, migrations.RunPython.noop),
    ]
