"""Remove retired user-level permission codes and clear leftover user_permissions."""

from django.db import migrations


def cleanup_user_permissions(apps, schema_editor):
    Permission = apps.get_model('auth', 'Permission')
    User = apps.get_model('users', 'User')

    User.user_permissions.through.objects.all().delete()
    Permission.objects.filter(
        content_type__app_label='users',
        codename__in=['view_user_permission', 'change_user_permission'],
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_department_manager'),
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
                ],
            },
        ),
        migrations.RunPython(cleanup_user_permissions, migrations.RunPython.noop),
    ]
