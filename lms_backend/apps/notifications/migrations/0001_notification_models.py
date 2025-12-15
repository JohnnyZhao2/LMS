"""
Initial migration for notifications app.

Creates:
- Notification model
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0001_task_models'),
        ('submissions', '0001_submission_models'),
        ('spot_checks', '0001_spot_check_models'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('notification_type', models.CharField(
                    choices=[
                        ('TASK_ASSIGNED', '任务分配'),
                        ('DEADLINE_REMINDER', '截止提醒'),
                        ('GRADING_COMPLETED', '评分完成'),
                        ('SPOT_CHECK', '抽查通知'),
                    ],
                    max_length=30,
                    verbose_name='通知类型'
                )),
                ('title', models.CharField(max_length=200, verbose_name='通知标题')),
                ('content', models.TextField(verbose_name='通知内容')),
                ('is_read', models.BooleanField(default=False, verbose_name='是否已读')),
                ('read_at', models.DateTimeField(blank=True, null=True, verbose_name='已读时间')),
                ('is_sent_to_robot', models.BooleanField(default=False, verbose_name='是否已发送到机器人')),
                ('sent_to_robot_at', models.DateTimeField(blank=True, null=True, verbose_name='机器人发送时间')),
                ('recipient', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='接收用户'
                )),
                ('task', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to='tasks.task',
                    verbose_name='关联任务'
                )),
                ('submission', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to='submissions.submission',
                    verbose_name='关联答题记录'
                )),
                ('spot_check', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to='spot_checks.spotcheck',
                    verbose_name='关联抽查记录'
                )),
            ],
            options={
                'verbose_name': '通知',
                'verbose_name_plural': '通知',
                'db_table': 'lms_notification',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read'], name='lms_notific_recipie_a1b2c3_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', '-created_at'], name='lms_notific_recipie_d4e5f6_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['notification_type'], name='lms_notific_notific_g7h8i9_idx'),
        ),
    ]
