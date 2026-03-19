from django.db import migrations


def merge_legacy_knowledge_content(apps, schema_editor):
    Knowledge = apps.get_model('knowledge', 'Knowledge')

    structured_fields = [
        ('fault_scenario', '故障场景'),
        ('trigger_process', '触发流程'),
        ('solution', '解决方案'),
        ('verification_plan', '验证方案'),
        ('recovery_plan', '恢复方案'),
    ]

    for knowledge in Knowledge.objects.all().iterator():
        sections = []

        summary = (getattr(knowledge, 'summary', '') or '').strip()
        if summary:
            sections.append(f'<h2>摘要</h2>{summary}')

        for field_name, label in structured_fields:
            value = (getattr(knowledge, field_name, '') or '').strip()
            if value:
                sections.append(f'<h2>{label}</h2>{value}')

        content = (getattr(knowledge, 'content', '') or '').strip()
        if content:
            if sections:
                sections.append(f'<h2>正文</h2>{content}')
            else:
                sections.append(content)

        merged_content = '\n'.join(sections).strip()
        if merged_content and merged_content != knowledge.content:
            knowledge.content = merged_content
            knowledge.save(update_fields=['content'])


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0008_rename_line_type_to_line_tag'),
    ]

    operations = [
        migrations.RunPython(
            code=merge_legacy_knowledge_content,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='knowledge_type',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='fault_scenario',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='trigger_process',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='solution',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='verification_plan',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='recovery_plan',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='summary',
        ),
    ]
