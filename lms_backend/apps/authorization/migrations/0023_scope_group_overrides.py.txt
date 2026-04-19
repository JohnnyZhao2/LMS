from django.db import migrations, models


SCOPE_GROUP_PERMISSION_CODES = {
    'user_scope': {'user.view'},
    'task_student_scope': {'task.assign', 'task.analytics.view'},
    'spot_check_student_scope': {'spot_check.view', 'spot_check.create'},
}


def _permission_to_scope_group(permission_code: str):
    for scope_group_key, permission_codes in SCOPE_GROUP_PERMISSION_CODES.items():
        if permission_code in permission_codes:
            return scope_group_key
    return None


def migrate_scope_aware_user_overrides(apps, schema_editor):
    UserPermissionOverride = apps.get_model('authorization', 'UserPermissionOverride')
    UserScopeGroupOverride = apps.get_model('authorization', 'UserScopeGroupOverride')

    for override in UserPermissionOverride.objects.select_related('permission').all():
        scope_group_key = _permission_to_scope_group(override.permission.code)
        if not scope_group_key:
            continue

        UserScopeGroupOverride.objects.update_or_create(
            user_id=override.user_id,
            scope_group_key=scope_group_key,
            effect=override.effect,
            applies_to_role=override.applies_to_role,
            scope_type=override.scope_type,
            created_at=override.created_at,
            defaults={
                'scope_user_ids': override.scope_user_ids,
                'reason': override.reason,
                'expires_at': override.expires_at,
                'is_active': override.is_active,
                'granted_by_id': override.granted_by_id,
                'revoked_by_id': override.revoked_by_id,
                'revoked_at': override.revoked_at,
                'revoked_reason': override.revoked_reason,
                'updated_at': override.updated_at,
            },
        )

        if override.effect != 'ALLOW':
            continue

        has_all_scope_override = UserPermissionOverride.objects.filter(
            user_id=override.user_id,
            permission_id=override.permission_id,
            effect='ALLOW',
            applies_to_role=override.applies_to_role,
            scope_type='ALL',
        ).exists()
        if has_all_scope_override:
            continue

        UserPermissionOverride.objects.create(
            user_id=override.user_id,
            permission_id=override.permission_id,
            effect='ALLOW',
            applies_to_role=override.applies_to_role,
            scope_type='ALL',
            scope_user_ids=[],
            reason=override.reason,
            expires_at=override.expires_at,
            is_active=override.is_active,
            granted_by_id=override.granted_by_id,
            revoked_by_id=override.revoked_by_id,
            revoked_at=override.revoked_at,
            revoked_reason=override.revoked_reason,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0022_alter_permissionscoperule_created_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserScopeGroupOverride',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('scope_group_key', models.CharField(db_index=True, max_length=100, verbose_name='范围组键')),
                ('effect', models.CharField(choices=[('ALLOW', '允许'), ('DENY', '拒绝')], db_index=True, max_length=10, verbose_name='覆盖效果')),
                ('applies_to_role', models.CharField(blank=True, choices=[('STUDENT', '学员'), ('MENTOR', '导师'), ('DEPT_MANAGER', '室经理'), ('ADMIN', '管理员'), ('TEAM_MANAGER', '团队经理')], db_index=True, max_length=20, null=True, verbose_name='生效角色')),
                ('scope_type', models.CharField(choices=[('ALL', '全部对象'), ('SELF', '本人数据'), ('MENTEES', '仅名下学员'), ('DEPARTMENT', '仅同部门'), ('EXPLICIT_USERS', '指定用户')], default='ALL', max_length=20, verbose_name='作用域类型')),
                ('scope_user_ids', models.JSONField(blank=True, default=list, verbose_name='指定用户ID列表')),
                ('reason', models.CharField(blank=True, default='', max_length=255, verbose_name='原因')),
                ('expires_at', models.DateTimeField(blank=True, db_index=True, null=True, verbose_name='过期时间')),
                ('is_active', models.BooleanField(db_index=True, default=True, verbose_name='是否启用')),
                ('revoked_at', models.DateTimeField(blank=True, null=True, verbose_name='撤销时间')),
                ('revoked_reason', models.CharField(blank=True, default='', max_length=255, verbose_name='撤销原因')),
                ('granted_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='granted_scope_group_overrides', to='users.user', verbose_name='授权人')),
                ('revoked_by', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='revoked_scope_group_overrides', to='users.user', verbose_name='撤销人')),
                ('user', models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='scope_group_overrides', to='users.user', verbose_name='目标用户')),
            ],
            options={
                'verbose_name': '用户范围组覆盖',
                'verbose_name_plural': '用户范围组覆盖',
                'db_table': 'lms_user_scope_group_override',
                'ordering': ['-created_at', '-id'],
            },
        ),
        migrations.AddIndex(
            model_name='userscopegroupoverride',
            index=models.Index(fields=['user', 'scope_group_key', 'is_active'], name='user_scope_group_u_g_a_idx'),
        ),
        migrations.AddIndex(
            model_name='userscopegroupoverride',
            index=models.Index(fields=['user', 'applies_to_role'], name='user_scope_group_u_r_idx'),
        ),
        migrations.RunPython(migrate_scope_aware_user_overrides, migrations.RunPython.noop),
    ]
