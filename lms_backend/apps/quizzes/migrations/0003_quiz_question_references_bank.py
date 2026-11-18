from django.db import migrations, models
import django.db.models.deletion


def promote_legacy_quiz_questions(apps, schema_editor):
    Question = apps.get_model('questions', 'Question')
    QuestionOption = apps.get_model('questions', 'QuestionOption')
    QuizQuestion = apps.get_model('quizzes', 'QuizQuestion')
    QuizQuestionOption = apps.get_model('quizzes', 'QuizQuestionOption')
    Tag = apps.get_model('tags', 'Tag')

    for relation in QuizQuestion.objects.select_related('quiz', 'question').iterator():
        source = relation.question
        options = list(
            QuizQuestionOption.objects.filter(question_id=relation.id)
            .order_by('sort_order', 'id')
            .values_list('sort_order', 'content', 'is_correct')
        )
        source_options = (
            list(
                QuestionOption.objects.filter(question_id=source.id)
                .order_by('sort_order', 'id')
                .values_list('sort_order', 'content', 'is_correct')
            ) if source else []
        )
        tag_ids = sorted(
            tag['id'] for tag in relation.tags_json
            if isinstance(tag, dict) and isinstance(tag.get('id'), int)
        )
        source_tag_ids = sorted(source.tags.values_list('id', flat=True)) if source else []
        source_space_name = (
            source.space_tag.name if source and source.space_tag_id else ''
        )
        content_differs = source is None or (
            source.content != relation.content
            or source.question_type != relation.question_type
            or source.reference_answer != relation.reference_answer
            or source.explanation != relation.explanation
            or source_options != options
            or source_space_name != relation.space_tag_name
            or source_tag_ids != tag_ids
        )
        if not content_differs:
            continue

        space_tag = Tag.objects.filter(
            tag_type='SPACE', name=relation.space_tag_name,
        ).first() if relation.space_tag_name else None
        new_question = Question.objects.create(
            content=relation.content,
            question_type=relation.question_type,
            reference_answer=relation.reference_answer,
            explanation=relation.explanation,
            score=relation.score,
            space_tag=space_tag,
            created_by_id=relation.quiz.created_by_id,
            updated_by_id=relation.quiz.updated_by_id,
            created_from_quiz_id=relation.quiz_id,
        )
        QuestionOption.objects.bulk_create([
            QuestionOption(
                question_id=new_question.id,
                sort_order=order,
                content=content,
                is_correct=is_correct,
            )
            for order, content, is_correct in options
        ])
        new_question.tags.set(Tag.objects.filter(id__in=tag_ids, tag_type='TAG'))
        relation.question_id = new_question.id
        relation.save(update_fields=['question'])


def fill_quiz_defaults(apps, schema_editor):
    for model_name in ('Quiz', 'QuizRevision'):
        model = apps.get_model('quizzes', model_name)
        for row in model.objects.all().order_by('id'):
            fields = ['duration', 'pass_score']
            if model_name == 'QuizRevision':
                row.allow_retry = row.quiz_type != 'EXAM'
                fields.append('allow_retry')
            if row.duration is None:
                row.duration = 60
            if row.pass_score is None:
                row.pass_score = 60
            row.save(update_fields=fields)


class Migration(migrations.Migration):
    dependencies = [
        ('quizzes', '0002_initial'),
    ]

    operations = [
        migrations.RunPython(promote_legacy_quiz_questions, migrations.RunPython.noop),
        migrations.DeleteModel(name='QuizQuestionOption'),
        migrations.RemoveField(model_name='quizquestion', name='content'),
        migrations.RemoveField(model_name='quizquestion', name='question_type'),
        migrations.RemoveField(model_name='quizquestion', name='reference_answer'),
        migrations.RemoveField(model_name='quizquestion', name='explanation'),
        migrations.RemoveField(model_name='quizquestion', name='space_tag_name'),
        migrations.RemoveField(model_name='quizquestion', name='tags_json'),
        migrations.AlterField(
            model_name='quizquestion',
            name='question',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='quiz_uses',
                to='questions.question',
                verbose_name='题库题目',
            ),
        ),
        migrations.AlterField(
            model_name='quizquestion',
            name='score',
            field=models.DecimalField(
                max_digits=5, decimal_places=2, default=5, verbose_name='本试卷分值',
            ),
        ),
        migrations.RemoveConstraint(
            model_name='quizrevision',
            name='uniq_quiz_revision_number',
        ),
        migrations.RemoveField(model_name='quizrevision', name='revision_number'),
        migrations.RemoveField(model_name='quizrevision', name='structure_hash'),
        migrations.AddField(
            model_name='quizrevision',
            name='allow_retry',
            field=models.BooleanField(default=False, verbose_name='允许重做'),
        ),
        migrations.RunPython(fill_quiz_defaults, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='quiz',
            name='duration',
            field=models.PositiveIntegerField(verbose_name='参考时间(分钟)'),
        ),
        migrations.AlterField(
            model_name='quiz',
            name='pass_score',
            field=models.DecimalField(decimal_places=2, max_digits=5, verbose_name='参考分数'),
        ),
        migrations.AlterField(
            model_name='quizrevision',
            name='duration',
            field=models.PositiveIntegerField(verbose_name='参考时间(分钟)'),
        ),
        migrations.AlterField(
            model_name='quizrevision',
            name='pass_score',
            field=models.DecimalField(decimal_places=2, max_digits=5, verbose_name='参考分数'),
        ),
        migrations.RemoveField(model_name='quiz', name='quiz_type'),
        migrations.RemoveField(model_name='quizrevision', name='quiz_type'),
    ]
