from django.db import migrations


TARGET_PERMISSION_DEFINITIONS = {
    'user.view': {
        'name': '查看用户',
        'module': 'user',
        'description': '查看用户列表和详情',
    },
    'user.manage': {
        'name': '管理用户资料',
        'module': 'user',
        'description': '创建用户、编辑用户资料和指定导师',
    },
    'user.account.manage': {
        'name': '管理用户账号',
        'module': 'user',
        'description': '启用/停用账号并重置密码',
    },
    'user.authorization.manage': {
        'name': '管理用户授权',
        'module': 'user',
        'description': '分配角色并配置用户权限自定义',
    },
    'user.delete': {
        'name': '删除用户',
        'module': 'user',
        'description': '彻底删除离职用户',
    },
    'authorization.role_template.view': {
        'name': '查看角色模板',
        'module': 'authorization',
        'description': '查看角色权限模板',
    },
    'authorization.role_template.update': {
        'name': '更新角色模板',
        'module': 'authorization',
        'description': '更新角色权限模板',
    },
}


LEGACY_TO_TARGET_PERMISSION_CODES = {
    'user.create': 'user.manage',
    'user.update': 'user.manage',
    'user.assign_mentor': 'user.manage',
    'user.activate': 'user.account.manage',
    'user.deactivate': 'user.account.manage',
    'user.reset_password': 'user.account.manage',
    'user.assign_roles': 'user.authorization.manage',
    'authorization.user_override.view': 'user.authorization.manage',
    'authorization.user_override.create': 'user.authorization.manage',
    'authorization.user_override.revoke': 'user.authorization.manage',
}


def refactor_user_management_permissions(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')

    for code, defaults in TARGET_PERMISSION_DEFINITIONS.items():
        Permission.objects.update_or_create(
            code=code,
            defaults={
                **defaults,
                'is_active': True,
            },
        )

    target_id_by_code = {
        item['code']: item['id']
        for item in Permission.objects.filter(code__in=TARGET_PERMISSION_DEFINITIONS.keys()).values('id', 'code')
    }

    for legacy_code, target_code in LEGACY_TO_TARGET_PERMISSION_CODES.items():
        legacy_permission = Permission.objects.filter(code=legacy_code).first()
        target_permission_id = target_id_by_code.get(target_code)
        if not legacy_permission or target_permission_id is None:
            continue

        role_ids = list(
            RolePermission.objects.filter(permission_id=legacy_permission.id).values_list('role_id', flat=True)
        )
        for role_id in role_ids:
            RolePermission.objects.get_or_create(
                role_id=role_id,
                permission_id=target_permission_id,
            )

        UserPermissionOverride.objects.filter(permission_id=legacy_permission.id).update(
            permission_id=target_permission_id
        )
        RolePermission.objects.filter(permission_id=legacy_permission.id).delete()
        legacy_permission.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0007_sync_admin_default_permissions'),
    ]

    operations = [
        migrations.RunPython(refactor_user_management_permissions, migrations.RunPython.noop),
    ]
