"""清空并重建最终授权数据。"""

from django.db import migrations, transaction


def initialize_final_authorization(apps, schema_editor):
    from apps.authorization.constants import (
        FIXED_PERMISSION_REQUIRED_ROLES,
        PERMISSION_CATALOG,
    )

    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')
    RoleScope = apps.get_model('authorization', 'RoleScope')
    UserRolePermission = apps.get_model('authorization', 'UserRolePermission')
    UserRoleScope = apps.get_model('authorization', 'UserRoleScope')
    Role = apps.get_model('users', 'Role')
    UserRole = apps.get_model('users', 'UserRole')

    catalog_codes = {item['code'] for item in PERMISSION_CATALOG}

    with transaction.atomic():
        for item in PERMISSION_CATALOG:
            Permission.objects.update_or_create(
                code=item['code'],
                defaults={
                    'name': item['name'],
                    'module': item['module'],
                    'description': item['description'],
                    'is_active': True,
                    'is_configurable': bool(item.get('is_configurable', True)),
                },
            )
        Permission.objects.exclude(code__in=catalog_codes).update(is_active=False)

        UserRoleScope.objects.all().delete()
        UserRolePermission.objects.all().delete()
        RoleScope.objects.all().delete()
        RolePermission.objects.all().delete()

        roles_by_code = {role.code: role for role in Role.objects.all()}
        permissions_by_code = {
            permission.code: permission
            for permission in Permission.objects.filter(
                code__in=FIXED_PERMISSION_REQUIRED_ROLES,
                is_active=True,
            )
        }

        role_permission_rows = []
        user_permission_rows = []
        for permission_code, required_role_codes in FIXED_PERMISSION_REQUIRED_ROLES.items():
            permission = permissions_by_code.get(permission_code)
            if permission is None:
                continue
            for role_code in required_role_codes:
                role = roles_by_code.get(role_code)
                if role is None:
                    continue
                role_permission_rows.append(
                    RolePermission(
                        role=role,
                        permission=permission,
                        effect='ALLOW',
                    )
                )
                if role_code == 'STUDENT':
                    continue
                user_permission_rows.extend(
                    UserRolePermission(
                        user_role=user_role,
                        permission=permission,
                    )
                    for user_role in UserRole.objects.filter(role=role)
                )

        RolePermission.objects.bulk_create(role_permission_rows, batch_size=500)
        UserRolePermission.objects.bulk_create(user_permission_rows, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0030_add_final_authorization_models'),
    ]

    operations = [
        migrations.RunPython(
            initialize_final_authorization,
            migrations.RunPython.noop,
        ),
    ]
