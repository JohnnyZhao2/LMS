from django.db import migrations, models


def seed_permission_scope_rules(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    PermissionScopeRule = apps.get_model('authorization', 'PermissionScopeRule')

    seed_rows = {
        'task.assign': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER', 'ALL:ADMIN'],
        'task.analytics.view': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER', 'ALL:ADMIN'],
        'spot_check.view': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER'],
        'spot_check.create': ['MENTEES:MENTOR', 'DEPARTMENT:DEPT_MANAGER'],
        'user.mentee.view': ['MENTEES:MENTOR'],
        'user.department_member.view': ['DEPARTMENT:DEPT_MANAGER'],
    }

    for permission_code, entries in seed_rows.items():
        permission = Permission.objects.filter(code=permission_code).first()
        if permission is None:
            continue
        for entry in entries:
            scope_type, role_code = entry.split(':', 1)
            PermissionScopeRule.objects.update_or_create(
                permission=permission,
                role_code=role_code,
                scope_type=scope_type,
                defaults={'is_active': True},
            )


def clear_permission_scope_rules(apps, schema_editor):
    PermissionScopeRule = apps.get_model('authorization', 'PermissionScopeRule')
    PermissionScopeRule.objects.filter(
        permission__code__in=[
            'task.assign',
            'task.analytics.view',
            'spot_check.view',
            'spot_check.create',
            'user.mentee.view',
            'user.department_member.view',
        ]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0015_alter_rolepermission_options'),
    ]

    operations = [
        migrations.CreateModel(
            name='PermissionScopeRule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('role_code', models.CharField(choices=[('STUDENT', '学员'), ('MENTOR', '导师'), ('DEPT_MANAGER', '室经理'), ('ADMIN', '管理员'), ('TEAM_MANAGER', '团队经理')], db_index=True, max_length=20, verbose_name='角色代码')),
                ('scope_type', models.CharField(choices=[('ALL', '全部对象'), ('SELF', '本人数据'), ('MENTEES', '仅名下学员'), ('DEPARTMENT', '仅同部门'), ('EXPLICIT_USERS', '指定用户')], db_index=True, max_length=20, verbose_name='范围类型')),
                ('is_active', models.BooleanField(db_index=True, default=True, verbose_name='是否启用')),
                ('permission', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='scope_rules', to='authorization.permission', verbose_name='权限')),
            ],
            options={
                'verbose_name': '权限范围规则',
                'verbose_name_plural': '权限范围规则',
                'db_table': 'lms_permission_scope_rule',
                'ordering': ['permission__code', 'role_code', 'scope_type'],
                'unique_together': {('permission', 'role_code', 'scope_type')},
            },
        ),
        migrations.AddIndex(
            model_name='permissionscoperule',
            index=models.Index(fields=['permission', 'role_code'], name='perm_scope_rule_p_r_idx'),
        ),
        migrations.AddIndex(
            model_name='permissionscoperule',
            index=models.Index(fields=['role_code', 'scope_type'], name='perm_scope_rule_r_s_idx'),
        ),
        migrations.RunPython(seed_permission_scope_rules, clear_permission_scope_rules),
    ]
