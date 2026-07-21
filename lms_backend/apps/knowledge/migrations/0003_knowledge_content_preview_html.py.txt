from django.db import migrations, models

from apps.knowledge.previews import build_content_preview_html


def populate_content_previews(apps, schema_editor):
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    pending_updates = []

    for knowledge in Knowledge.objects.only('id', 'content').iterator(chunk_size=200):
        knowledge.content_preview_html = build_content_preview_html(knowledge.content)
        pending_updates.append(knowledge)
        if len(pending_updates) == 200:
            Knowledge.objects.bulk_update(pending_updates, ['content_preview_html'])
            pending_updates.clear()

    if pending_updates:
        Knowledge.objects.bulk_update(pending_updates, ['content_preview_html'])


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledge',
            name='content_preview_html',
            field=models.TextField(
                blank=True,
                default='',
                editable=False,
                verbose_name='卡片预览',
            ),
        ),
        migrations.RunPython(populate_content_previews, migrations.RunPython.noop),
    ]
