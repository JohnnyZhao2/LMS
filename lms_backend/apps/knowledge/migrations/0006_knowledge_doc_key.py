from django.db import migrations, models

from apps.knowledge.doc_url import normalize_doc_key


def backfill_doc_key(apps, schema_editor):
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    to_update = []
    for item in Knowledge.objects.exclude(external_doc_url='').only('id', 'external_doc_url', 'doc_key'):
        key = normalize_doc_key(item.external_doc_url) or ''
        if item.doc_key != key:
            item.doc_key = key
            to_update.append(item)
    if to_update:
        Knowledge.objects.bulk_update(to_update, ['doc_key'], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0005_add_pinned_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledge',
            name='doc_key',
            field=models.CharField(blank=True, db_index=True, default='', max_length=500, verbose_name='文档归一化标识'),
        ),
        migrations.RunPython(backfill_doc_key, migrations.RunPython.noop),
    ]
