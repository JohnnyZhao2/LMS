from django.db import migrations


def detach_superuser_roles(apps, schema_editor):
    User = apps.get_model('users', 'User')
    UserRole = apps.get_model('users', 'UserRole')

    superuser_ids = User.objects.filter(is_superuser=True).values_list('id', flat=True)
    UserRole.objects.filter(user_id__in=superuser_ids).delete()


def noop(apps, schema_editor):
    return


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_alter_user_username'),
    ]

    operations = [
        migrations.RunPython(detach_superuser_roles, noop),
    ]
