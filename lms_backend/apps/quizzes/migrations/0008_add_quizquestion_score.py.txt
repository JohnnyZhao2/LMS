from django.db import migrations, models


def populate_quizquestion_score(apps, schema_editor):
    QuizQuestion = apps.get_model('quizzes', 'QuizQuestion')

    for relation in QuizQuestion.objects.select_related('question').all():
        relation.score = relation.question.score
        relation.save(update_fields=['score'])


class Migration(migrations.Migration):

    dependencies = [
        ('quizzes', '0007_remove_quiz_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='quizquestion',
            name='score',
            field=models.DecimalField(decimal_places=2, default=1.0, max_digits=5, verbose_name='本卷分值'),
        ),
        migrations.RunPython(populate_quizquestion_score, migrations.RunPython.noop),
    ]
