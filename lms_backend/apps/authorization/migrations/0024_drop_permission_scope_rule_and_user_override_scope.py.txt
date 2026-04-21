from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0023_scope_group_overrides'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userpermissionoverride',
            name='scope_type',
        ),
        migrations.RemoveField(
            model_name='userpermissionoverride',
            name='scope_user_ids',
        ),
        migrations.DeleteModel(
            name='PermissionScopeRule',
        ),
    ]
