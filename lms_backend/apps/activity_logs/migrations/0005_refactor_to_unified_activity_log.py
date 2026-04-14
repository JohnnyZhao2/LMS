from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def forwards_copy_logs(apps, schema_editor):
    ActivityLog = apps.get_model('activity_logs', 'ActivityLog')
    UserLog = apps.get_model('activity_logs', 'UserLog')
    ContentLog = apps.get_model('activity_logs', 'ContentLog')
    OperationLog = apps.get_model('activity_logs', 'OperationLog')

    user_templates = {
        'login': '{actor} 登录成功',
        'logout': '{actor} 退出登录',
        'login_failed': '{actor} 登录失败',
        'switch_role': '{actor} 切换了角色',
        'password_change': '{actor} 重置了用户密码',
        'role_assigned': '{actor} 更新了用户角色',
        'mentor_assigned': '{actor} 分配了导师',
        'activate': '{actor} 启用了用户账号',
        'deactivate': '{actor} 停用了用户账号',
    }
    content_type_names = {
        'knowledge': '知识文档',
        'quiz': '试卷',
        'question': '题目',
        'assignment': '作业',
    }
    content_action_verbs = {
        'create': '创建了',
        'update': '更新了',
        'delete': '删除了',
        'publish': '发布了',
    }
    operation_templates = {
        'create_and_assign': '{actor} 创建了任务《{target}》',
        'update_task': '{actor} 更新了任务《{target}》',
        'delete_task': '{actor} 删除了任务《{target}》',
        'create_spot_check': '{actor} 抽查了 {target}',
        'update_spot_check': '{actor} 更新了 {target} 的抽查记录',
        'delete_spot_check': '{actor} 删除了 {target} 的抽查记录',
        'manual_grade': '{actor} 批改了答卷',
        'batch_grade': '{actor} 批量评分',
        'start_quiz': '{actor} 开始答题《{target}》',
        'submit': '{actor} 提交了《{target}》',
        'complete_knowledge': '{actor} 完成了知识学习《{target}》',
    }

    def truncate(value):
        return (value or '')[:255]

    activity_logs = []

    for log in UserLog.objects.select_related('user', 'operator').iterator():
        actor = log.operator or log.user
        actor_name = actor.username if actor else '系统'
        template = user_templates.get(log.action, '{actor} 执行了 ' + log.action)
        activity_logs.append(ActivityLog(
            category='user',
            actor_id=actor.id if actor else None,
            action=log.action,
            summary=truncate(template.format(actor=actor_name, user=log.user.username)),
            description=log.description,
            status=log.status,
            target_type='user',
            target_id=str(log.user_id),
            target_title=truncate(log.user.username),
            duration=0,
            created_at=log.created_at,
        ))

    for log in ContentLog.objects.select_related('operator').iterator():
        actor_name = log.operator.username if log.operator else '系统'
        verb = content_action_verbs.get(log.action, log.action)
        type_name = content_type_names.get(log.content_type, log.content_type)
        resolved_title = log.content_title or ''
        if log.content_type == 'question' and len(resolved_title) > 20:
            resolved_title = resolved_title[:20] + '...'
        if resolved_title and log.content_type != 'question':
            summary = f'{actor_name} {verb}{type_name}《{resolved_title}》'
        else:
            summary = f'{actor_name} {verb}{type_name}'
        activity_logs.append(ActivityLog(
            category='content',
            actor_id=log.operator_id,
            action=log.action,
            summary=truncate(summary),
            description=log.description,
            status=log.status,
            target_type=log.content_type,
            target_id=log.content_id,
            target_title=truncate(log.content_title),
            duration=0,
            created_at=log.created_at,
        ))

    for log in OperationLog.objects.select_related('operator').iterator():
        actor_name = log.operator.username if log.operator else '系统'
        template = operation_templates.get(log.action)
        summary = template.format(actor=actor_name, target=log.target_title or '') if template else f'{actor_name} {log.action}'
        activity_logs.append(ActivityLog(
            category='operation',
            actor_id=log.operator_id,
            action=log.action,
            summary=truncate(summary),
            description=log.description,
            status=log.status,
            target_type=log.target_type or log.operation_type,
            target_id=log.target_id,
            target_title=truncate(log.target_title),
            duration=log.duration,
            created_at=log.created_at,
        ))

    ActivityLog.objects.bulk_create(activity_logs, batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('activity_logs', '0004_operationlog_target_id_operationlog_target_title_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ActivityLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('category', models.CharField(choices=[('user', '用户日志'), ('content', '内容日志'), ('operation', '操作日志')], max_length=20, verbose_name='日志类型')),
                ('action', models.CharField(max_length=100, verbose_name='操作')),
                ('summary', models.CharField(max_length=255, verbose_name='摘要')),
                ('description', models.TextField(blank=True, default='', verbose_name='详情')),
                ('status', models.CharField(choices=[('success', '成功'), ('failed', '失败'), ('partial', '部分成功')], default='success', max_length=20, verbose_name='状态')),
                ('target_type', models.CharField(blank=True, default='', max_length=50, verbose_name='目标类型')),
                ('target_id', models.CharField(blank=True, default='', max_length=100, verbose_name='目标ID')),
                ('target_title', models.CharField(blank=True, default='', max_length=255, verbose_name='目标标题')),
                ('duration', models.IntegerField(default=0, verbose_name='耗时(毫秒)')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='activity_logs', to=settings.AUTH_USER_MODEL, verbose_name='行为主体')),
            ],
            options={
                'verbose_name': '活动日志',
                'verbose_name_plural': '活动日志',
                'db_table': 'activity_logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['category', '-created_at'], name='actlog_cat_created_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['actor', '-created_at'], name='actlog_actor_created_idx'),
        ),
        migrations.AddIndex(
            model_name='activitylog',
            index=models.Index(fields=['action', '-created_at'], name='actlog_action_created_idx'),
        ),
        migrations.RunPython(forwards_copy_logs, migrations.RunPython.noop),
        migrations.DeleteModel(
            name='ContentLog',
        ),
        migrations.DeleteModel(
            name='OperationLog',
        ),
        migrations.DeleteModel(
            name='UserLog',
        ),
    ]
