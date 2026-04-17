from django.db import migrations


def remove_accidental_admin001_superuser(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(employee_id='ADMIN001', is_superuser=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_user_avatar_key'),
    ]

    operations = [
        migrations.RunPython(remove_accidental_admin001_superuser, migrations.RunPython.noop),
    ]
