import django.db.models.deletion
from django.db import migrations, models


def drop_orphan_revision_questions(apps, schema_editor):
    Question = apps.get_model('quizzes', 'QuizRevisionQuestion')
    Option = apps.get_model('quizzes', 'QuizRevisionQuestionOption')
    Answer = apps.get_model('submissions', 'Answer')
    AnswerSelection = apps.get_model('submissions', 'AnswerSelection')
    orphan_ids = list(Question.objects.filter(task_quiz_id__isnull=True).order_by().values_list('id', flat=True))
    if not orphan_ids:
        return
    answer_ids = list(Answer.objects.filter(question_id__in=orphan_ids).values_list('id', flat=True))
    AnswerSelection.objects.filter(answer_id__in=answer_ids).delete()
    Answer.objects.filter(id__in=answer_ids).delete()
    Option.objects.filter(question_id__in=orphan_ids).delete()
    Question.objects.filter(id__in=orphan_ids).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('quizzes', '0006_attach_questions_to_task_quiz'),
        ('tasks', '0007_fold_quiz_revision_into_task_quiz'),
        ('submissions', '0004_submission_uses_task_quiz'),
    ]

    operations = [
        migrations.RemoveField(model_name='quizrevisionquestion', name='quiz'),
        migrations.RemoveField(model_name='quizrevisionquestion', name='question'),
        migrations.RemoveField(model_name='quizrevisionquestion', name='space_tag_name'),
        migrations.RemoveField(model_name='quizrevisionquestion', name='tags_json'),
        migrations.RunPython(drop_orphan_revision_questions, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='quizrevisionquestion',
            name='task_quiz',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='quiz_questions',
                to='tasks.taskquiz',
                verbose_name='任务试卷',
            ),
        ),
        migrations.AddConstraint(
            model_name='quizrevisionquestion',
            constraint=models.UniqueConstraint(
                fields=('task_quiz', 'order'),
                name='uniq_quiz_revision_question_order',
            ),
        ),
        migrations.RenameModel('QuizRevisionQuestion', 'TaskQuizQuestion'),
        migrations.RenameModel('QuizRevisionQuestionOption', 'TaskQuizQuestionOption'),
        migrations.DeleteModel('QuizRevision'),
        migrations.AlterModelOptions(
            name='taskquizquestion',
            options={
                'ordering': ['task_quiz_id', 'order', 'id'],
                'verbose_name': '任务试卷题目',
                'verbose_name_plural': '任务试卷题目',
            },
        ),
        migrations.AlterModelOptions(
            name='taskquizquestionoption',
            options={
                'ordering': ['question_id', 'sort_order', 'id'],
                'verbose_name': '任务试卷题目选项',
                'verbose_name_plural': '任务试卷题目选项',
            },
        ),
        migrations.AlterField(
            model_name='taskquizquestionoption',
            name='question',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='question_options',
                to='quizzes.taskquizquestion',
                verbose_name='任务试卷题目',
            ),
        ),
    ]
