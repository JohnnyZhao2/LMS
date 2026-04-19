from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0002_question_option_refactor'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='question',
            name='options',
        ),
        migrations.RemoveField(
            model_name='question',
            name='answer',
        ),
    ]
