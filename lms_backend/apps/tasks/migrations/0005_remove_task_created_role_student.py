from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0004_update_created_role_choices'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='created_role',
            field=models.CharField(
                choices=[
                    ('GLOBAL', '全局'),
                    ('MENTOR', '导师'),
                    ('DEPT', '室组'),
                ],
                db_index=True,
                default='GLOBAL',
                max_length=20,
                verbose_name='创建时角色',
            ),
        ),
    ]
