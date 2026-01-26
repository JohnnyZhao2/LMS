from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityLogPolicy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=120, unique=True, verbose_name='动作标识')),
                ('category', models.CharField(choices=[('user', '用户日志'), ('content', '内容日志'), ('operation', '操作日志')], max_length=20, verbose_name='日志类型')),
                ('group', models.CharField(max_length=50, verbose_name='分组')),
                ('label', models.CharField(max_length=100, verbose_name='动作名称')),
                ('enabled', models.BooleanField(default=True, verbose_name='是否记录')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
            ],
            options={
                'verbose_name': '活动日志策略',
                'verbose_name_plural': '活动日志策略',
                'db_table': 'activity_log_policies',
                'ordering': ['category', 'group', 'label'],
            },
        ),
        migrations.AddIndex(
            model_name='activitylogpolicy',
            index=models.Index(fields=['category', 'group'], name='activity_log_policy_cg_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylogpolicy',
            index=models.Index(fields=['key'], name='activity_log_policy_key_idx'),
        ),
    ]
