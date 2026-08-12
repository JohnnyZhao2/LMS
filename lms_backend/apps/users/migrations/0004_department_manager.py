from django.db import migrations, models
import django.db.models.deletion


def seed_department_managers(apps, schema_editor):
    User = apps.get_model('users', 'User')
    Department = apps.get_model('users', 'Department')
    membership = User.groups.through
    manager_ids = membership.objects.filter(
        group__name='DEPT_MANAGER',
        user__is_active=True,
    ).values_list('user_id', flat=True)
    for user in User.objects.filter(pk__in=manager_ids).select_related('department'):
        department = user.department
        if department is None or department.manager_id:
            continue
        department.manager_id = user.id
        department.save(update_fields=['manager'])


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_drop_role_tables'),
    ]

    operations = [
        migrations.AddField(
            model_name='department',
            name='manager',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='managed_departments',
                to='users.user',
                verbose_name='室经理',
            ),
        ),
        migrations.RunPython(seed_department_managers, migrations.RunPython.noop),
    ]
