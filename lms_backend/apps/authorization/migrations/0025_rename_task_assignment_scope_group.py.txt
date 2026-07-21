from django.db import migrations


def rename_task_assignment_scope_group(apps, schema_editor):
    UserScopeGroupOverride = apps.get_model('authorization', 'UserScopeGroupOverride')
    UserScopeGroupOverride.objects.filter(scope_group_key='task_student_scope').update(
        scope_group_key='task_assignment_scope',
    )


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0024_drop_permission_scope_rule_and_user_override_scope'),
    ]

    operations = [
        migrations.RunPython(rename_task_assignment_scope_group, migrations.RunPython.noop),
    ]
