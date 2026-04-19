from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0014_role_permission_overrides'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='rolepermission',
            options={
                'ordering': ['role__code', 'effect', 'permission__code'],
                'verbose_name': '角色权限覆盖',
                'verbose_name_plural': '角色权限覆盖',
            },
        ),
    ]
