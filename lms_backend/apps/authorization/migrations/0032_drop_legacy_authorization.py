"""删除旧授权字段与覆盖模型。"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0031_initialize_final_authorization'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='rolepermission',
            name='effect',
        ),
        migrations.DeleteModel(
            name='UserPermissionOverride',
        ),
        migrations.DeleteModel(
            name='UserScopeGroupOverride',
        ),
    ]
