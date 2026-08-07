"""Move role and user grants to Django auth permissions."""

from django.db import migrations


CRUD_TARGETS = {
    'user': ('users', 'user', '用户'),
    'tag': ('tags', 'tag', '标签'),
    'knowledge': ('knowledge', 'knowledge', '知识'),
    'question': ('questions', 'question', '题目'),
    'quiz': ('quizzes', 'quiz', '试卷'),
    'task': ('tasks', 'task', '任务'),
    'spot_check': ('spot_checks', 'spotcheck', '抽查'),
}
CRUD_ACTIONS = {
    'view': ('view', '查看'),
    'create': ('add', '创建'),
    'update': ('change', '更新'),
    'delete': ('delete', '删除'),
}
EXTRA_PERMISSIONS = {
    'user.activate': ('users', 'user', 'activate_user', '启停账号'),
    'user.role.assign': ('users', 'user', 'assign_user_role', '分配用户角色'),
    'user.permission.view': ('users', 'user', 'view_user_permission', '查看用户权限'),
    'user.permission.update': ('users', 'user', 'change_user_permission', '更新用户权限'),
    'user.avatar.update': ('users', 'user', 'change_user_avatar', '修改他人头像'),
    'task.assign': ('tasks', 'task', 'assign_task', '分配任务'),
    'task.analytics.view': ('tasks', 'task', 'view_task_analytics', '查看任务分析'),
    'grading.view': ('tasks', 'task', 'view_grading', '查看阅卷中心'),
    'grading.score': ('tasks', 'task', 'score_grading', '提交评分'),
    'activity_log.view': ('activity_logs', 'activitylog', 'view_activitylog', '查看活动日志'),
    'activity_log.policy.update': (
        'activity_logs', 'activitylogpolicy', 'change_activitylogpolicy', '更新日志策略'
    ),
}
ROLE_PERMISSIONS = {
    # STUDENT：执行态自带能力，不种 Group 权限
    'MENTOR': {
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign', 'task.analytics.view',
        'spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'grading.view', 'grading.score', 'tag.view', 'tag.create',
    },
    'DEPT_MANAGER': {
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign', 'task.analytics.view',
        'spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'grading.view', 'grading.score',
        'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
        'tag.view', 'tag.create', 'tag.update', 'tag.delete',
    },
    'ADMIN': {
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'knowledge.view', 'knowledge.create', 'knowledge.update', 'knowledge.delete',
        'tag.view', 'tag.create', 'tag.update', 'tag.delete',
        'user.view', 'user.create', 'user.update', 'user.delete',
        'user.activate', 'user.role.assign', 'user.permission.view', 'user.permission.update',
        'user.avatar.update', 'activity_log.view', 'activity_log.policy.update',
    },
}


def permission_specs():
    specs = dict(EXTRA_PERMISSIONS)
    for prefix, (app_label, model, label) in CRUD_TARGETS.items():
        for action, (django_action, action_label) in CRUD_ACTIONS.items():
            specs[f'{prefix}.{action}'] = (
                app_label, model, f'{django_action}_{model}', f'{action_label}{label}'
            )
    return specs


def copy_permissions(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    AuthPermission = apps.get_model('auth', 'Permission')
    Group = apps.get_model('auth', 'Group')
    User = apps.get_model('users', 'User')
    OldUserPermission = apps.get_model('authorization', 'UserPermission')
    UserPermission = User.user_permissions.through
    GroupPermission = Group.permissions.through

    permission_id_by_code = {}
    for code, (app_label, model, codename, name) in permission_specs().items():
        content_type, _ = ContentType.objects.get_or_create(app_label=app_label, model=model)
        permission, _ = AuthPermission.objects.update_or_create(
            content_type=content_type,
            codename=codename,
            defaults={'name': name},
        )
        permission_id_by_code[code] = permission.id

    role_codes_by_user_id = {
        user.id: set(user.groups.values_list('name', flat=True))
        for user in User.objects.prefetch_related('groups')
    }
    user_rows = []
    for user_id, code in OldUserPermission.objects.values_list('user_id', 'permission__code'):
        inherited_codes = set().union(*(
            ROLE_PERMISSIONS.get(role_code, set())
            for role_code in role_codes_by_user_id.get(user_id, set())
        ))
        if code in inherited_codes:
            continue
        permission_id = permission_id_by_code.get(code)
        if permission_id:
            user_rows.append(UserPermission(user_id=user_id, permission_id=permission_id))
    UserPermission.objects.bulk_create(user_rows, batch_size=500, ignore_conflicts=True)

    group_rows = []
    for role_code, codes in ROLE_PERMISSIONS.items():
        group, _ = Group.objects.get_or_create(name=role_code)
        group_rows.extend(
            GroupPermission(group_id=group.id, permission_id=permission_id_by_code[code])
            for code in codes
        )
    GroupPermission.objects.bulk_create(group_rows, batch_size=500, ignore_conflicts=True)


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0028_user_permission_simplify'),
        ('tasks', '0004_task_auth_permissions'),
        ('users', '0002_use_django_groups'),
    ]

    operations = [
        migrations.RunPython(copy_permissions, migrations.RunPython.noop),
        migrations.DeleteModel(name='UserPermission'),
        migrations.DeleteModel(name='Permission'),
    ]
