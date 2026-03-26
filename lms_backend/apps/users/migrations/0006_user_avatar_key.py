from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_drop_legacy_management_profile_column'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar_key',
            field=models.CharField(blank=True, default='avatar-01', max_length=32),
        ),
    ]
