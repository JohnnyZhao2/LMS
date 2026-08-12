"""Drop legacy Role / UserRole after roles live on Django Groups."""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_use_django_groups'),
        ('authorization', '0028_use_django_auth_permissions'),
    ]

    operations = [
        migrations.RemoveField(model_name='user', name='roles'),
        migrations.DeleteModel(name='UserRole'),
        migrations.DeleteModel(name='Role'),
    ]
