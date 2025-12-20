# Generated migration to make employee_id field required

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_alter_user_options_alter_user_managers_and_more'),
    ]

    operations = [
        # 将 employee_id 字段改为必填（NOT NULL）
        # 由于我们已经确认数据库中没有 NULL 值，可以直接修改
        migrations.AlterField(
            model_name='user',
            name='employee_id',
            field=models.CharField(max_length=100, unique=True),
        ),
    ]
