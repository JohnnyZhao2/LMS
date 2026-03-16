"""Rename user management permission codes for clarity.

user.manage → user.create + user.update
user.account.manage → user.activate
user.authorization.manage → user.authorize
"""
from django.db import migrations


RENAME_MAP = {
    'user.account.manage': 'user.activate',
    'user.authorization.manage': 'user.authorize',
}

SPLIT_PERMISSION = {
    'old_code': 'user.manage',
    'new_permissions': [
        {
            'code': 'user.create',
            'name': '创建用户',
            'module': 'user',
            'description': '创建新用户',
        },
        {
            'code': 'user.update',
            'name': '编辑用户',
            'module': 'user',
            'description': '编辑用户资料和指定导师',
        },
    ],
}


def rename_user_permission_codes(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')

    # 1. Simple renames
    for old_code, new_code in RENAME_MAP.items():
        Permission.objects.filter(code=old_code).update(
            code=new_code,
            name={'user.activate': '启停账号', 'user.authorize': '分配权限'}[new_code],
            description={
                'user.activate': '启用/停用账号并重置密码',
                'user.authorize': '分配角色并配置用户权限自定义',
            }[new_code],
        )

    # 2. Split user.manage → user.create + user.update
    old_perm = Permission.objects.filter(code=SPLIT_PERMISSION['old_code']).first()
    if not old_perm:
        return

    new_perm_ids = []
    for defn in SPLIT_PERMISSION['new_permissions']:
        new_perm, _ = Permission.objects.update_or_create(
            code=defn['code'],
            defaults={
                'name': defn['name'],
                'module': defn['module'],
                'description': defn['description'],
                'is_active': True,
            },
        )
        new_perm_ids.append(new_perm.id)

    # Copy RolePermission rows
    role_ids = list(
        RolePermission.objects.filter(permission_id=old_perm.id).values_list('role_id', flat=True)
    )
    for role_id in role_ids:
        for new_id in new_perm_ids:
            RolePermission.objects.get_or_create(role_id=role_id, permission_id=new_id)

    # Copy UserPermissionOverride rows
    for override in UserPermissionOverride.objects.filter(permission_id=old_perm.id):
        for new_id in new_perm_ids:
            UserPermissionOverride.objects.get_or_create(
                user_id=override.user_id,
                permission_id=new_id,
                applies_to_role=override.applies_to_role,
                defaults={
                    'effect': override.effect,
                    'scope_type': override.scope_type,
                    'scope_user_ids': override.scope_user_ids,
                    'reason': override.reason,
                    'expires_at': override.expires_at,
                    'granted_by': override.granted_by,
                },
            )

    # Clean up old permission
    RolePermission.objects.filter(permission_id=old_perm.id).delete()
    UserPermissionOverride.objects.filter(permission_id=old_perm.id).delete()
    old_perm.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0008_refactor_user_management_permissions'),
    ]

    operations = [
        migrations.RunPython(rename_user_permission_codes, migrations.RunPython.noop),
    ]
