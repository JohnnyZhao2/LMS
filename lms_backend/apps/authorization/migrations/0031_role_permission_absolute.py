from django.db import migrations, models


ROLE_CHOICES = [
    ('STUDENT', '学员'),
    ('MENTOR', '导师'),
    ('DEPT', '室组'),
    ('GLOBAL', '全局'),
]


MENTOR_DEFAULTS = frozenset({
    'grading.view',
    'grading.score',
    'question.view',
    'question.create',
    'question.update',
    'question.delete',
    'quiz.view',
    'quiz.create',
    'quiz.update',
    'quiz.delete',
    'spot_check.view',
    'spot_check.create',
    'spot_check.update',
    'spot_check.delete',
    'tag.view',
    'tag.create',
    'task.view',
    'task.create',
    'task.update',
    'task.delete',
    'task.assign',
    'task.analytics.view',
    'dashboard.mentor.view',
})

DEPT_DEFAULTS = MENTOR_DEFAULTS | frozenset({
    'knowledge.view',
    'knowledge.create',
    'knowledge.update',
    'knowledge.delete',
    'tag.update',
    'tag.delete',
})

GLOBAL_DEFAULTS = frozenset({
    'knowledge.view',
    'knowledge.create',
    'knowledge.update',
    'knowledge.delete',
    'question.view',
    'question.create',
    'question.update',
    'question.delete',
    'quiz.view',
    'quiz.create',
    'quiz.update',
    'quiz.delete',
    'tag.view',
    'tag.create',
    'tag.update',
    'tag.delete',
    'task.view',
    'task.create',
    'task.update',
    'task.delete',
    'task.assign',
    'user.avatar.update',
    'dashboard.admin.view',
})

ROLE_BASE_DEFAULTS = {
    'MENTOR': MENTOR_DEFAULTS,
    'DEPT': DEPT_DEFAULTS,
    'GLOBAL': GLOBAL_DEFAULTS,
}


def convert_role_permissions_to_absolute(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')

    RolePermission.objects.filter(role__code='STUDENT').delete()

    for role in Role.objects.exclude(code='STUDENT'):
        base_defaults = ROLE_BASE_DEFAULTS.get(role.code)
        if base_defaults is None:
            RolePermission.objects.filter(role=role).delete()
            continue

        effective_codes = set(base_defaults)
        overrides = RolePermission.objects.filter(role=role).select_related('permission')
        for override in overrides:
            permission_code = override.permission.code
            if override.effect == 'ALLOW':
                effective_codes.add(permission_code)
            elif override.effect == 'DENY':
                effective_codes.discard(permission_code)

        RolePermission.objects.filter(role=role).delete()

        permissions = Permission.objects.filter(code__in=effective_codes, is_active=True)
        RolePermission.objects.bulk_create(
            [
                RolePermission(role=role, permission=permission, effect='ALLOW')
                for permission in permissions
            ],
            batch_size=500,
        )


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0030_drop_user_scope_group_override'),
        ('users', '0002_role_auth_triangle'),
    ]

    operations = [
        migrations.RunPython(convert_role_permissions_to_absolute, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='userpermissionoverride',
            name='applies_to_role',
            field=models.CharField(
                blank=True,
                choices=ROLE_CHOICES,
                db_index=True,
                default='',
                max_length=20,
                verbose_name='生效角色',
            ),
        ),
    ]
