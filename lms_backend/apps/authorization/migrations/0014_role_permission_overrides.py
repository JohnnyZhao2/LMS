from django.db import migrations, models


EFFECT_ALLOW = 'ALLOW'
EFFECT_DENY = 'DENY'

CONFIG_MODULE_PERMISSION_CODES = frozenset({
    'activity_log.policy.update',
    'activity_log.view',
    'authorization.role_template.update',
    'authorization.role_template.view',
})

SYSTEM_MANAGED_PERMISSION_CODES = frozenset({
    'dashboard.admin.view',
    'dashboard.mentor.view',
    'dashboard.student.view',
    'dashboard.team_manager.view',
    'profile.update',
    'profile.view',
    'submission.answer',
    'submission.review',
})

ROLE_SYSTEM_PERMISSION_DEFAULTS = {
    'STUDENT': [
        'profile.view',
        'profile.update',
        'submission.answer',
        'submission.review',
    ],
    'TEAM_MANAGER': [],
    'ADMIN': [],
}

ROLE_PERMISSION_DEFAULTS = {
    'STUDENT': [
        'knowledge.view',
        'task.view',
    ],
    'MENTOR': [
        'tag.view',
        'tag.create',
        'quiz.view',
        'quiz.create',
        'quiz.update',
        'quiz.delete',
        'question.view',
        'question.create',
        'question.update',
        'question.delete',
        'task.view',
        'task.create',
        'task.update',
        'task.delete',
        'task.assign',
        'task.analytics.view',
        'spot_check.view',
        'spot_check.create',
        'spot_check.update',
        'spot_check.delete',
        'grading.view',
        'grading.score',
    ],
    'DEPT_MANAGER': [
        'knowledge.view',
        'knowledge.create',
        'knowledge.update',
        'knowledge.delete',
        'tag.view',
        'tag.create',
        'tag.update',
        'tag.delete',
        'quiz.view',
        'quiz.create',
        'quiz.update',
        'quiz.delete',
        'question.view',
        'question.create',
        'question.update',
        'question.delete',
        'task.view',
        'task.create',
        'task.update',
        'task.delete',
        'task.assign',
        'task.analytics.view',
        'spot_check.view',
        'spot_check.create',
        'spot_check.update',
        'spot_check.delete',
        'grading.view',
        'grading.score',
    ],
    'TEAM_MANAGER': [
        'knowledge.view',
        'analytics.view',
    ],
    'ADMIN': [
        'knowledge.view',
        'knowledge.create',
        'knowledge.update',
        'knowledge.delete',
        'tag.view',
        'tag.create',
        'tag.update',
        'tag.delete',
        'quiz.view',
        'quiz.create',
        'quiz.update',
        'quiz.delete',
        'question.view',
        'question.create',
        'question.update',
        'question.delete',
        'task.view',
        'task.create',
        'task.update',
        'task.delete',
        'task.assign',
    ],
}


def _can_manage_config_permissions(role_code):
    return role_code == 'ADMIN'


def _get_system_role_permission_code_set(role_code):
    return set(ROLE_SYSTEM_PERMISSION_DEFAULTS.get(role_code, []))


def _normalize_role_permission_codes(role_code, permission_codes):
    normalized_codes = {code for code in permission_codes if code}
    if not _can_manage_config_permissions(role_code):
        normalized_codes -= set(CONFIG_MODULE_PERMISSION_CODES)
    normalized_codes -= set(SYSTEM_MANAGED_PERMISSION_CODES)
    normalized_codes |= _get_system_role_permission_code_set(role_code)
    return normalized_codes


def convert_role_permission_snapshots_to_overrides(apps, schema_editor):
    Permission = apps.get_model('authorization', 'Permission')
    Role = apps.get_model('users', 'Role')
    RolePermission = apps.get_model('authorization', 'RolePermission')

    permission_ids_by_code = dict(
        Permission.objects.filter(is_active=True).values_list('code', 'id')
    )

    for role in Role.objects.all():
        snapshot_codes = set(
            RolePermission.objects.filter(
                role=role,
                permission__is_active=True,
            ).values_list('permission__code', flat=True)
        )
        if not snapshot_codes:
            continue

        role_code = role.code
        effective_snapshot_codes = _normalize_role_permission_codes(role_code, snapshot_codes)
        default_codes = _normalize_role_permission_codes(
            role_code,
            ROLE_PERMISSION_DEFAULTS.get(role_code, []),
        )
        system_codes = _get_system_role_permission_code_set(role_code)
        allow_codes = sorted((effective_snapshot_codes - default_codes) - system_codes)
        deny_codes = sorted((default_codes - effective_snapshot_codes) - system_codes)

        RolePermission.objects.filter(role=role).delete()
        RolePermission.objects.bulk_create(
            [
                RolePermission(
                    role=role,
                    permission_id=permission_ids_by_code[permission_code],
                    effect=EFFECT_ALLOW,
                )
                for permission_code in allow_codes
                if permission_code in permission_ids_by_code
            ]
            + [
                RolePermission(
                    role=role,
                    permission_id=permission_ids_by_code[permission_code],
                    effect=EFFECT_DENY,
                )
                for permission_code in deny_codes
                if permission_code in permission_ids_by_code
            ],
            batch_size=500,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0013_restore_tag_permissions_to_defaults'),
    ]

    operations = [
        migrations.AddField(
            model_name='rolepermission',
            name='effect',
            field=models.CharField(
                choices=[('ALLOW', '允许'), ('DENY', '拒绝')],
                db_index=True,
                default='ALLOW',
                max_length=10,
                verbose_name='覆盖效果',
            ),
        ),
        migrations.RunPython(
            convert_role_permission_snapshots_to_overrides,
            migrations.RunPython.noop,
        ),
    ]
