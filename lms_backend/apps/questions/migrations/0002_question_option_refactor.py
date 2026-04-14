from django.db import migrations, models
import django.db.models.deletion


def migrate_question_storage(apps, schema_editor):
    Question = apps.get_model('questions', 'Question')
    QuestionOption = apps.get_model('questions', 'QuestionOption')

    for question in Question.objects.all().iterator():
        question_type = question.question_type
        raw_options = question.options or []
        raw_answer = question.answer

        if question_type == 'SHORT_ANSWER':
            question.reference_answer = raw_answer if isinstance(raw_answer, str) else ''
            question.save(update_fields=['reference_answer'])
            continue

        if question_type == 'TRUE_FALSE':
            label_map = {
                option['key']: option['value']
                for option in raw_options
                if isinstance(option, dict) and option.get('key') in {'TRUE', 'FALSE'}
            }
            QuestionOption.objects.create(
                question_id=question.id,
                sort_order=1,
                content=label_map.get('TRUE') or '正确',
                is_correct=raw_answer == 'TRUE',
            )
            QuestionOption.objects.create(
                question_id=question.id,
                sort_order=2,
                content=label_map.get('FALSE') or '错误',
                is_correct=raw_answer == 'FALSE',
            )
            continue

        correct_keys = {raw_answer} if question_type == 'SINGLE_CHOICE' else set(raw_answer or [])
        for index, option in enumerate(raw_options, start=1):
            QuestionOption.objects.create(
                question_id=question.id,
                sort_order=index,
                content=option['value'],
                is_correct=option['key'] in correct_keys,
            )


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='reference_answer',
            field=models.TextField(blank=True, default='', verbose_name='参考答案'),
        ),
        migrations.CreateModel(
            name='QuestionOption',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                ('sort_order', models.PositiveIntegerField(default=1, verbose_name='排序')),
                ('content', models.TextField(verbose_name='选项内容')),
                ('is_correct', models.BooleanField(default=False, verbose_name='是否正确答案')),
                ('question', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='question_options', to='questions.question', verbose_name='题目')),
            ],
            options={
                'verbose_name': '题目选项',
                'verbose_name_plural': '题目选项',
                'db_table': 'lms_question_option',
                'ordering': ['question_id', 'sort_order', 'id'],
            },
        ),
        migrations.AddConstraint(
            model_name='questionoption',
            constraint=models.UniqueConstraint(fields=('question', 'sort_order'), name='uniq_question_option_order'),
        ),
        migrations.RunPython(migrate_question_storage, migrations.RunPython.noop),
    ]
