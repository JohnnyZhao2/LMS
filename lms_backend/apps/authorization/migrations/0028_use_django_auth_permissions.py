"""Drop custom RBAC tables. Role defaults and user extras are configured in the UI."""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('authorization', '0027_permission_overrides_current_state'),
    ]

    operations = [
        migrations.DeleteModel(name='UserScopeGroupOverride'),
        migrations.DeleteModel(name='UserPermissionOverride'),
        migrations.DeleteModel(name='RolePermission'),
        migrations.DeleteModel(name='Permission'),
    ]
