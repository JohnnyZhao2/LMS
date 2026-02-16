from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0008_question_line_type'),
    ]

    operations = [
        migrations.RenameField(
            model_name='question',
            old_name='line_type',
            new_name='line_tag',
        ),
    ]
