"""新建 UserPermission，按角色 recommended seed 一次；删除旧模板/override 表；清理 TEAM_MANAGER。

破坏性：不迁移旧 RolePermission / UserPermissionOverride 差量。
"""

from django.db import migrations, models
import django.db.models.deletion


MANAGEMENT_ROLES = ('MENTOR', 'DEPT_MANAGER', 'ADMIN')
SEED_ROLE_PRIORITY = ('ADMIN', 'DEPT_MANAGER', 'MENTOR')

# 冻结快照，与迁移时 recommended_initial_permissions 对齐
RECOMMENDED_SEED = {
    'MENTOR': {
        'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign', 'task.analytics.view',
        'spot_check.view', 'spot_check.create', 'spot_check.update', 'spot_check.delete',
        'question.view', 'question.create', 'question.update', 'question.delete',
        'quiz.view', 'quiz.create', 'quiz.update', 'quiz.delete',
        'grading.view', 'grading.score',
        'tag.view', 'tag.create',
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
        'user.avatar.update',
        'activity_log.view', 'activity_log.policy.update',
    },
}


def seed_user_permissions(apps, schema_editor):
    User = apps.get_model('users', 'User')
    Permission = apps.get_model('authorization', 'Permission')
    UserPermission = apps.get_model('authorization', 'UserPermission')
    permission_by_code = {item.code: item for item in Permission.objects.all()}
    rows = []
    for user in User.objects.filter(is_superuser=False).prefetch_related('roles'):
        role_codes = {role.code for role in user.roles.all()} & set(MANAGEMENT_ROLES)
        if not role_codes:
            continue
        seed_role = next((code for code in SEED_ROLE_PRIORITY if code in role_codes), None)
        if not seed_role:
            continue
        for code in sorted(RECOMMENDED_SEED.get(seed_role, ())):
            permission = permission_by_code.get(code)
            if permission is None:
                continue
            rows.append(UserPermission(user_id=user.id, permission_id=permission.id))
    if rows:
        UserPermission.objects.bulk_create(rows, batch_size=500, ignore_conflicts=True)


def cleanup_team_manager(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    UserRole = apps.get_model('users', 'UserRole')
    Task = apps.get_model('tasks', 'Task')

    team_manager = Role.objects.filter(code='TEAM_MANAGER').first()
    if team_manager:
        user_ids = list(
            UserRole.objects.filter(role=team_manager).values_list('user_id', flat=True)
        )
        UserRole.objects.filter(role=team_manager).delete()
        student = Role.objects.filter(code='STUDENT').first()
        if student and user_ids:
            existing = set(
                UserRole.objects.filter(
                    user_id__in=user_ids,
                    role=student,
                ).values_list('user_id', flat=True)
            )
            UserRole.objects.bulk_create(
                [
                    UserRole(user_id=user_id, role_id=student.id)
                    for user_id in user_ids
                    if user_id not in existing
                ],
                batch_size=500,
            )
        team_manager.delete()

    Task.objects.filter(created_role='TEAM_MANAGER').update(created_role='ADMIN')


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0027_permission_overrides_current_state'),
        ('users', '0001_initial'),
        ('tasks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserPermission',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                (
                    'permission',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='granted_users',
                        to='authorization.permission',
                        verbose_name='权限',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='granted_permissions',
                        to='users.user',
                        verbose_name='用户',
                    ),
                ),
            ],
            options={
                'verbose_name': '用户权限',
                'verbose_name_plural': '用户权限',
                'db_table': 'lms_user_permission',
                'ordering': ['user_id', 'permission__code'],
                'unique_together': {('user', 'permission')},
            },
        ),
        migrations.RunPython(seed_user_permissions, noop_reverse),
        migrations.RunPython(cleanup_team_manager, noop_reverse),
        migrations.DeleteModel(name='RolePermission'),
        migrations.DeleteModel(name='UserPermissionOverride'),
        migrations.DeleteModel(name='UserScopeGroupOverride'),
    ]
