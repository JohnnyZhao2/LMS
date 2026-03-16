from django.db import migrations


def backfill_student_role_for_admin_users(apps, schema_editor):
    Role = apps.get_model('users', 'Role')
    User = apps.get_model('users', 'User')
    UserRole = apps.get_model('users', 'UserRole')

    student_role, _ = Role.objects.get_or_create(
        code='STUDENT',
        defaults={
            'name': '学员',
            'description': '系统默认角色',
        },
    )

    admin_user_ids = set(
        UserRole.objects.filter(role__code='ADMIN').values_list('user_id', flat=True)
    )
    manager_user_ids = set(
        UserRole.objects.filter(
            role__code__in=['DEPT_MANAGER', 'TEAM_MANAGER']
        ).values_list('user_id', flat=True)
    )
    superuser_ids = set(
        User.objects.filter(is_superuser=True).values_list('id', flat=True)
    )
    target_user_ids = sorted(admin_user_ids - manager_user_ids - superuser_ids)
    if not target_user_ids:
        return

    existing_student_user_ids = set(
        UserRole.objects.filter(
            user_id__in=target_user_ids,
            role_id=student_role.id,
        ).values_list('user_id', flat=True)
    )
    missing_user_ids = [
        user_id for user_id in target_user_ids if user_id not in existing_student_user_ids
    ]
    if not missing_user_ids:
        return

    UserRole.objects.bulk_create(
        [UserRole(user_id=user_id, role_id=student_role.id) for user_id in missing_user_ids],
        ignore_conflicts=True,
    )


def noop(apps, schema_editor):
    return


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0003_superuser_detach_roles'),
    ]

    operations = [
        migrations.RunPython(backfill_student_role_for_admin_users, noop),
    ]
