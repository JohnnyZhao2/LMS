from collections import defaultdict

import django.db.models.deletion
from django.db import migrations, models


def attach_questions(apps, schema_editor):
    TaskQuiz = apps.get_model('tasks', 'TaskQuiz')
    Question = apps.get_model('quizzes', 'QuizRevisionQuestion')
    Option = apps.get_model('quizzes', 'QuizRevisionQuestionOption')
    Answer = apps.get_model('submissions', 'Answer')
    AnswerSelection = apps.get_model('submissions', 'AnswerSelection')
    Submission = apps.get_model('submissions', 'Submission')

    grouped = defaultdict(list)
    for task_quiz in TaskQuiz.objects.all():
        grouped[task_quiz.quiz_id].append(task_quiz)

    for revision_id, task_quizzes in grouped.items():
        questions = list(Question.objects.filter(quiz_id=revision_id).order_by('order', 'id'))
        with_submissions = [
            task_quiz for task_quiz in task_quizzes
            if Submission.objects.filter(task_quiz_id=task_quiz.id).exists()
        ]
        primary = with_submissions[0] if with_submissions else task_quizzes[0]
        Question.objects.filter(id__in=[question.id for question in questions]).update(task_quiz_id=primary.id)
        for task_quiz in task_quizzes:
            if task_quiz.id == primary.id:
                continue
            question_map = {}
            option_map = {}
            for question in questions:
                cloned = Question.objects.create(
                    quiz_id=revision_id,
                    task_quiz_id=task_quiz.id,
                    question_id=question.question_id,
                    content=question.content,
                    question_type=question.question_type,
                    reference_answer=question.reference_answer,
                    explanation=question.explanation,
                    score=question.score,
                    order=question.order,
                    space_tag_name=question.space_tag_name,
                    tags_json=question.tags_json,
                )
                question_map[question.id] = cloned.id
                for option in Option.objects.filter(question_id=question.id):
                    cloned_option = Option.objects.create(
                        question_id=cloned.id,
                        sort_order=option.sort_order,
                        content=option.content,
                        is_correct=option.is_correct,
                    )
                    option_map[option.id] = cloned_option.id
            for answer in Answer.objects.filter(
                submission__task_quiz_id=task_quiz.id,
                question_id__in=question_map,
            ):
                answer.question_id = question_map[answer.question_id]
                answer.save(update_fields=['question_id'])
            for selection in AnswerSelection.objects.filter(
                answer__submission__task_quiz_id=task_quiz.id,
                question_option_id__in=option_map,
            ):
                selection.question_option_id = option_map[selection.question_option_id]
                selection.save(update_fields=['question_option_id'])


class Migration(migrations.Migration):
    dependencies = [
        ('quizzes', '0003_quiz_question_references_bank'),
        ('tasks', '0006_task_is_archived'),
        ('submissions', '0003_initial'),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name='quizrevisionquestion',
            name='uniq_quiz_revision_question_order',
        ),
        migrations.AddField(
            model_name='quizrevisionquestion',
            name='task_quiz',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='quiz_questions',
                to='tasks.taskquiz',
                verbose_name='任务试卷',
            ),
        ),
        migrations.RunPython(attach_questions, migrations.RunPython.noop),
    ]
