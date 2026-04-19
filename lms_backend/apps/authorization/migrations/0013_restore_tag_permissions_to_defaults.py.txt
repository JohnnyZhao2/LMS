from django.db import migrations


TAG_PERMISSION_DEFINITIONS = [
    ('tag.view', '查看标签', 'tag', '查看标签管理页和标签列表'),
    ('tag.create', '创建标签', 'tag', '创建新标签'),
    ('tag.update', '更新标签', 'tag', '更新标签信息与适用范围'),
    ('tag.delete', '删除标签', 'tag', '删除标签'),
]

ROLE_DEFAULTS = {
    'MENTOR': ['tag.view', 'tag.create'],
    'DEPT_MANAGER': ['tag.view', 'tag.create', 'tag.update', 'tag.delete'],
    'ADMIN': ['tag.view', 'tag.create', 'tag.update', 'tag.delete'],
}


def restore_tag_permissions(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')
    Role = apps.get_model('users', 'Role')

    permissions_by_code = {}
    for code, name, module, description in TAG_PERMISSION_DEFINITIONS:
        permission, _ = Permission.objects.update_or_create(
            code=code,
            defaults={
                'name': name,
                'module': module,
                'description': description,
                'is_active': True,
            },
        )
        permissions_by_code[code] = permission

    for role_code, permission_codes in ROLE_DEFAULTS.items():
        role = Role.objects.filter(code=role_code).first()
        if not role:
            continue
        for permission_code in permission_codes:
            RolePermission.objects.get_or_create(
                role=role,
                permission=permissions_by_code[permission_code],
            )


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0012_add_tag_permissions'),
    ]

    operations = [
        migrations.RunPython(restore_tag_permissions, migrations.RunPython.noop),
    ]
