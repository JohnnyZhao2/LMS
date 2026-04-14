from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0003_answer_selection_refactor'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='answer',
            name='user_answer',
        ),
    ]
