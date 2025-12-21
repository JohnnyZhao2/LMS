import uuid

from django.db import migrations, models


def _extract_summary(knowledge):
    if knowledge.knowledge_type == 'OTHER':
        text = knowledge.content or ''
    else:
        for field in [
            'fault_scenario',
            'trigger_process',
            'solution',
            'verification_plan',
            'recovery_plan',
        ]:
            value = getattr(knowledge, field, '')
            if value:
                text = value
                break
        else:
            text = ''
    return (text or '')[:160]


def build_knowledge_snapshot(knowledge, line_relation):
    line_data = None
    if line_relation and line_relation.line_type_id:
        line_data = {
            'id': line_relation.line_type_id,
            'name': line_relation.line_type.name,
        } if line_relation.line_type else None
    knowledge_type_choices = dict(knowledge._meta.get_field('knowledge_type').choices)
    return {
        'id': knowledge.id,
        'resource_uuid': str(knowledge.resource_uuid),
        'version_number': knowledge.version_number,
        'title': knowledge.title,
        'knowledge_type': knowledge.knowledge_type,
        'knowledge_type_display': knowledge_type_choices.get(knowledge.knowledge_type, knowledge.knowledge_type),
        'summary': _extract_summary(knowledge),
        'content': knowledge.content,
        'fault_scenario': knowledge.fault_scenario,
        'trigger_process': knowledge.trigger_process,
        'solution': knowledge.solution,
        'verification_plan': knowledge.verification_plan,
        'recovery_plan': knowledge.recovery_plan,
        'line_type': line_data,
        'system_tags': list(knowledge.system_tags.values('id', 'name')),
        'operation_tags': list(knowledge.operation_tags.values('id', 'name')),
    }


def build_quiz_snapshot(quiz, quiz_questions):
    questions_payload = []
    total_score = 0
    objective_count = 0
    subjective_count = 0

    for relation in quiz_questions:
        question = relation.question
        if not question:
            continue
        score_value = question.score or 0
        questions_payload.append({
            'id': question.id,
            'resource_uuid': str(question.resource_uuid),
            'version_number': question.version_number,
            'content': question.content,
            'question_type': question.question_type,
            'options': question.options,
            'answer': question.answer,
            'explanation': question.explanation,
            'score': float(score_value),
            'order': relation.order,
        })
        total_score += score_value
        if question.question_type == 'SHORT_ANSWER':
            subjective_count += 1
        else:
            objective_count += 1

    return {
        'id': quiz.id,
        'resource_uuid': str(quiz.resource_uuid),
        'version_number': quiz.version_number,
        'title': quiz.title,
        'description': quiz.description,
        'question_count': len(questions_payload),
        'total_score': float(total_score),
        'has_subjective_questions': subjective_count > 0,
        'objective_question_count': objective_count,
        'subjective_question_count': subjective_count,
        'questions': questions_payload,
    }


def populate_task_snapshots(apps, schema_editor):
    TaskKnowledge = apps.get_model('tasks', 'TaskKnowledge')
    TaskQuiz = apps.get_model('tasks', 'TaskQuiz')
    ResourceLineType = apps.get_model('knowledge', 'ResourceLineType')
    QuizQuestion = apps.get_model('quizzes', 'QuizQuestion')
    ContentType = apps.get_model('contenttypes', 'ContentType')

    db_alias = schema_editor.connection.alias
    knowledge_ct = ContentType.objects.get(app_label='knowledge', model='knowledge')

    task_knowledge_qs = TaskKnowledge.objects.using(db_alias).select_related('knowledge')
    for tk in task_knowledge_qs.iterator():
        knowledge = tk.knowledge
        if not knowledge:
            continue
        line_relation = ResourceLineType.objects.using(db_alias).filter(
            content_type_id=knowledge_ct.id,
            object_id=knowledge.id,
        ).select_related('line_type').first()
        tk.resource_uuid = knowledge.resource_uuid
        tk.version_number = knowledge.version_number
        tk.snapshot = build_knowledge_snapshot(knowledge, line_relation)
        tk.save(update_fields=['resource_uuid', 'version_number', 'snapshot'])

    task_quiz_qs = TaskQuiz.objects.using(db_alias).select_related('quiz')
    for tq in task_quiz_qs.iterator():
        quiz = tq.quiz
        if not quiz:
            continue
        quiz_questions = QuizQuestion.objects.using(db_alias).filter(
            quiz=quiz
        ).select_related('question').order_by('order')
        tq.resource_uuid = quiz.resource_uuid
        tq.version_number = quiz.version_number
        tq.snapshot = build_quiz_snapshot(quiz, quiz_questions)
        tq.save(update_fields=['resource_uuid', 'version_number', 'snapshot'])


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0007_versioning_and_snapshots'),
        ('quizzes', '0002_quiz_versioning'),
        ('tasks', '0001_task_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='taskknowledge',
            name='resource_uuid',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, verbose_name='知识资源ID'),
        ),
        migrations.AddField(
            model_name='taskknowledge',
            name='version_number',
            field=models.PositiveIntegerField(default=1, verbose_name='知识版本号'),
        ),
        migrations.AddField(
            model_name='taskknowledge',
            name='snapshot',
            field=models.JSONField(default=dict, verbose_name='知识快照'),
        ),
        migrations.AddField(
            model_name='taskquiz',
            name='resource_uuid',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, verbose_name='试卷资源ID'),
        ),
        migrations.AddField(
            model_name='taskquiz',
            name='version_number',
            field=models.PositiveIntegerField(default=1, verbose_name='试卷版本号'),
        ),
        migrations.AddField(
            model_name='taskquiz',
            name='snapshot',
            field=models.JSONField(default=dict, verbose_name='试卷快照'),
        ),
        migrations.RunPython(populate_task_snapshots, migrations.RunPython.noop),
    ]

