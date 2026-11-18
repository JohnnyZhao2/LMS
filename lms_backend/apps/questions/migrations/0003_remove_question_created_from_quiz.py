from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('questions', '0002_initial'),
        ('quizzes', '0003_quiz_question_references_bank'),
    ]

    operations = [
        migrations.RemoveField(model_name='question', name='created_from_quiz'),
        migrations.RemoveField(model_name='question', name='score'),
    ]
