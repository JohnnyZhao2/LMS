from django.db import migrations, models


def _build_latest_line_type_map(queryset):
    latest = {}
    for object_id, line_type_id in queryset.order_by(
        'object_id',
        '-created_at',
        '-id',
    ).values_list('object_id', 'line_type_id'):
        if object_id not in latest:
            latest[object_id] = line_type_id
    return latest


def migrate_resource_line_type_to_direct_fk(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    ResourceLineType = apps.get_model('knowledge', 'ResourceLineType')
    Question = apps.get_model('questions', 'Question')

    knowledge_ct = ContentType.objects.filter(
        app_label='knowledge',
        model='knowledge',
    ).first()
    if knowledge_ct:
        knowledge_line_type_map = _build_latest_line_type_map(
            ResourceLineType.objects.filter(content_type_id=knowledge_ct.id)
        )
        if knowledge_line_type_map:
            knowledge_list = list(
                Knowledge.objects.filter(id__in=knowledge_line_type_map.keys())
            )
            for knowledge in knowledge_list:
                knowledge.line_type_id = knowledge_line_type_map[knowledge.id]
            Knowledge.objects.bulk_update(knowledge_list, ['line_type'])

    question_ct = ContentType.objects.filter(
        app_label='questions',
        model='question',
    ).first()
    if question_ct:
        question_line_type_map = _build_latest_line_type_map(
            ResourceLineType.objects.filter(content_type_id=question_ct.id)
        )
        if question_line_type_map:
            question_list = list(
                Question.objects.filter(id__in=question_line_type_map.keys())
            )
            for question in question_list:
                question.line_type_id = question_line_type_map[question.id]
            Question.objects.bulk_update(question_list, ['line_type'])


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0006_alter_knowledge_is_current_and_more'),
        ('questions', '0008_question_line_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledge',
            name='line_type',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'is_active': True, 'tag_type': 'LINE'},
                null=True,
                on_delete=models.deletion.PROTECT,
                related_name='knowledge_by_line',
                to='knowledge.tag',
                verbose_name='条线类型',
            ),
        ),
        migrations.RunPython(
            code=migrate_resource_line_type_to_direct_fk,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.DeleteModel(
            name='ResourceLineType',
        ),
    ]
