from django.db import migrations, models
import django.db.models.deletion


def build_choice_option_key(index: int) -> str:
    label_index = index + 1
    chars = []
    while label_index > 0:
        label_index, remainder = divmod(label_index - 1, 26)
        chars.append(chr(65 + remainder))
    return ''.join(reversed(chars))


def migrate_answer_storage(apps, schema_editor):
    Answer = apps.get_model('submissions', 'Answer')
    AnswerSelection = apps.get_model('submissions', 'AnswerSelection')
    Question = apps.get_model('questions', 'Question')
    QuestionOption = apps.get_model('questions', 'QuestionOption')

    question_map = {
        question.id: question
        for question in Question.objects.all().only('id', 'question_type')
    }

    for answer in Answer.objects.all().iterator():
        question = question_map[answer.question_id]
        raw_answer = answer.user_answer

        if question.question_type == 'SHORT_ANSWER':
            answer.text_answer = raw_answer if isinstance(raw_answer, str) else ''
            answer.save(update_fields=['text_answer'])
            continue

        option_qs = QuestionOption.objects.filter(question_id=answer.question_id).order_by('sort_order', 'id')
        options = list(option_qs)
        if question.question_type == 'TRUE_FALSE':
            key_map = {
                'TRUE': options[0].id,
                'FALSE': options[1].id,
            }
        else:
            key_map = {
                build_choice_option_key(index): option.id
                for index, option in enumerate(options)
            }

        if question.question_type == 'MULTIPLE_CHOICE':
            if not isinstance(raw_answer, list):
                continue
            normalized_keys = []
            for item in raw_answer:
                if isinstance(item, str) and item in key_map and item not in normalized_keys:
                    normalized_keys.append(item)
            for key in normalized_keys:
                AnswerSelection.objects.create(
                    answer_id=answer.id,
                    question_option_id=key_map[key],
                )
            continue

        if isinstance(raw_answer, str) and raw_answer in key_map:
            AnswerSelection.objects.create(
                answer_id=answer.id,
                question_option_id=key_map[raw_answer],
            )


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0002_question_option_refactor'),
        ('submissions', '0002_answer_is_marked'),
    ]

    operations = [
        migrations.AddField(
            model_name='answer',
            name='text_answer',
            field=models.TextField(blank=True, default='', verbose_name='文本答案'),
        ),
        migrations.CreateModel(
            name='AnswerSelection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('answer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='answer_selections', to='submissions.answer', verbose_name='答案记录')),
                ('question_option', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='answer_selections', to='questions.questionoption', verbose_name='题目选项')),
            ],
            options={
                'verbose_name': '答案选项',
                'verbose_name_plural': '答案选项',
                'db_table': 'lms_answer_selection',
                'ordering': ['answer_id', 'question_option_id'],
            },
        ),
        migrations.AddConstraint(
            model_name='answerselection',
            constraint=models.UniqueConstraint(fields=('answer', 'question_option'), name='uniq_answer_question_option'),
        ),
        migrations.RunPython(migrate_answer_storage, migrations.RunPython.noop),
    ]
