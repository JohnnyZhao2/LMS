"""将 QuizQuestion 从题目副本收拢为关系表，并删除 QuizQuestionOption。"""

from decimal import Decimal

from django.db import migrations, models
import django.db.models.deletion


def _option_defs_match(copy_options, question_options) -> bool:
    left = [
        (opt.sort_order, opt.content, opt.is_correct)
        for opt in sorted(copy_options, key=lambda item: (item.sort_order, item.id))
    ]
    right = [
        (opt.sort_order, opt.content, opt.is_correct)
        for opt in sorted(question_options, key=lambda item: (item.sort_order, item.id))
    ]
    return left == right


def _content_matches(quiz_question, question, copy_options) -> bool:
    if question is None:
        return False
    if quiz_question.content != question.content:
        return False
    if quiz_question.question_type != question.question_type:
        return False
    if (quiz_question.reference_answer or '') != (question.reference_answer or ''):
        return False
    if (quiz_question.explanation or '') != (question.explanation or ''):
        return False
    if Decimal(str(quiz_question.score)) != Decimal(str(question.score)):
        return False
    return _option_defs_match(copy_options, list(question.question_options.all()))


def forwards_bind_questions(apps, schema_editor):
    QuizQuestion = apps.get_model('quizzes', 'QuizQuestion')
    QuizQuestionOption = apps.get_model('quizzes', 'QuizQuestionOption')
    Question = apps.get_model('questions', 'Question')
    QuestionOption = apps.get_model('questions', 'QuestionOption')
    Tag = apps.get_model('tags', 'Tag')

    for relation in QuizQuestion.objects.all().iterator():
        copy_options = list(
            QuizQuestionOption.objects.filter(question_id=relation.id).order_by('sort_order', 'id')
        )
        source = None
        if relation.question_id:
            source = Question.objects.filter(pk=relation.question_id).prefetch_related(
                'question_options',
            ).first()

        if _content_matches(relation, source, copy_options):
            continue

        quiz = relation.quiz
        creator_id = (
            getattr(source, 'created_by_id', None)
            or getattr(quiz, 'created_by_id', None)
        )
        if creator_id is None:
            raise RuntimeError(
                f'无法为试卷题目 {relation.id} 创建题库题：缺少 created_by'
            )

        question = Question.objects.create(
            content=relation.content,
            question_type=relation.question_type,
            reference_answer=relation.reference_answer or '',
            explanation=relation.explanation or '',
            score=relation.score,
            created_by_id=creator_id,
            updated_by_id=creator_id,
        )
        QuestionOption.objects.bulk_create(
            [
                QuestionOption(
                    question=question,
                    sort_order=option.sort_order,
                    content=option.content,
                    is_correct=option.is_correct,
                )
                for option in copy_options
            ]
        )

        if relation.space_tag_name:
            space = Tag.objects.filter(
                name=relation.space_tag_name,
                tag_type='SPACE',
            ).first()
            if space is not None:
                question.space_tag_id = space.id
                question.save(update_fields=['space_tag'])

        tag_ids = []
        for tag_data in relation.tags_json or []:
            if isinstance(tag_data, dict) and tag_data.get('id'):
                tag_ids.append(tag_data['id'])
        if tag_ids:
            valid_ids = list(
                Tag.objects.filter(id__in=tag_ids, tag_type='TAG').values_list('id', flat=True)
            )
            if valid_ids:
                question.tags.set(valid_ids)

        relation.question_id = question.id
        relation.save(update_fields=['question_id'])


def noop_reverse(apps, schema_editor):
    raise migrations.IrreversibleError('QuizQuestion 关系表重构不可逆')


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0002_initial'),
        ('quizzes', '0002_initial'),
        ('tags', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(forwards_bind_questions, noop_reverse),
        migrations.AlterField(
            model_name='quizquestion',
            name='question',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='quiz_relations',
                to='questions.question',
                verbose_name='题目',
            ),
        ),
        migrations.RemoveConstraint(
            model_name='quizquestionoption',
            name='uniq_quiz_question_option_order',
        ),
        migrations.DeleteModel(
            name='QuizQuestionOption',
        ),
        migrations.RemoveField(
            model_name='quizquestion',
            name='content',
        ),
        migrations.RemoveField(
            model_name='quizquestion',
            name='explanation',
        ),
        migrations.RemoveField(
            model_name='quizquestion',
            name='question_type',
        ),
        migrations.RemoveField(
            model_name='quizquestion',
            name='reference_answer',
        ),
        migrations.RemoveField(
            model_name='quizquestion',
            name='score',
        ),
        migrations.RemoveField(
            model_name='quizquestion',
            name='space_tag_name',
        ),
        migrations.RemoveField(
            model_name='quizquestion',
            name='tags_json',
        ),
    ]
