from django.db import migrations


SYSTEM_ROLES = (
    {
        'code': 'STUDENT',
        'name': '学员',
        'description': '系统默认学习角色（可与管理角色共存）',
    },
    {
        'code': 'MENTOR',
        'name': '导师',
        'description': '可以指导学员',
    },
    {
        'code': 'DEPT_MANAGER',
        'name': '室经理',
        'description': '管理本室成员',
    },
    {
        'code': 'TEAM_MANAGER',
        'name': '团队经理',
        'description': '管理整个团队',
    },
    {
        'code': 'ADMIN',
        'name': '管理员',
        'description': '系统管理员，拥有所有权限',
    },
)


def seed_system_roles(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    for role_data in SYSTEM_ROLES:
        Role.objects.get_or_create(
            code=role_data['code'],
            defaults=role_data,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            seed_system_roles,
            migrations.RunPython.noop,
        ),
    ]
