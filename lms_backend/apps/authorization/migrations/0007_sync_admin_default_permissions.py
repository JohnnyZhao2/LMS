from django.db import migrations


ADMIN_DEFAULT_PERMISSION_CODES = [
    'knowledge.view',
    'knowledge.create',
    'knowledge.update',
    'knowledge.delete',
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
]


def sync_admin_default_permissions(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    Permission = apps.get_model('authorization', 'Permission')
    RolePermission = apps.get_model('authorization', 'RolePermission')

    admin_role = Role.objects.filter(code='ADMIN').first()
    if not admin_role:
        return

    permission_ids = list(
        Permission.objects.filter(
            code__in=ADMIN_DEFAULT_PERMISSION_CODES,
            is_active=True,
        ).values_list('id', flat=True)
    )

    RolePermission.objects.filter(role_id=admin_role.id).delete()
    RolePermission.objects.bulk_create(
        [
            RolePermission(role_id=admin_role.id, permission_id=permission_id)
            for permission_id in permission_ids
        ],
        batch_size=500,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('authorization', '0006_deactivate_student_role_overrides'),
    ]

    operations = [
        migrations.RunPython(sync_admin_default_permissions, migrations.RunPython.noop),
    ]
