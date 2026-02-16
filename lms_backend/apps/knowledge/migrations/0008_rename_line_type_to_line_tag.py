from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0007_line_type_refactor'),
    ]

    operations = [
        migrations.RenameField(
            model_name='knowledge',
            old_name='line_type',
            new_name='line_tag',
        ),
    ]
