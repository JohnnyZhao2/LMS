from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [('tasks', '0003_knowledgelearningprogress_started_at')]

    operations = [
        migrations.AlterModelOptions(
            name='task',
            options={
                'db_table': 'lms_task',
                'ordering': ['-created_at'],
                'permissions': [
                    ('assign_task', '分配任务'),
                    ('view_task_analytics', '查看任务分析'),
                    ('view_grading', '查看阅卷中心'),
                    ('score_grading', '提交评分'),
                ],
                'verbose_name': '任务',
                'verbose_name_plural': '任务',
            },
        ),
    ]
