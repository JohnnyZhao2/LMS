# Generated migration: Remove line_type field from Knowledge model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0005_add_resource_line_type'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='knowledge',
            name='line_type',
        ),
    ]

