# Generated migration: Remove tags field from Question model

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0002_remove_question_line_type_field'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='question',
            name='tags',
        ),
    ]

