# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('authorization', '0029_drop_override_reason_expires_at'),
    ]

    operations = [
        migrations.DeleteModel(
            name='UserScopeGroupOverride',
        ),
    ]
