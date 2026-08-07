"""Clear STUDENT group permissions: student capabilities are role-builtin, not grants."""

from django.db import migrations


def clear_student_group_permissions(apps, schema_editor):
    Group = apps.get_model('auth', 'Group')
    group = Group.objects.filter(name='STUDENT').first()
    if group is not None:
        group.permissions.clear()


class Migration(migrations.Migration):
    dependencies = [('authorization', '0029_use_django_auth_permissions')]
    operations = [
        migrations.RunPython(
            clear_student_group_permissions,
            migrations.RunPython.noop,
        ),
    ]
