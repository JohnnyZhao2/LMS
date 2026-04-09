from django.db import migrations, models


def migrate_source_url_to_related_links(apps, schema_editor):
    Knowledge = apps.get_model('knowledge', 'Knowledge')

    for knowledge in Knowledge.objects.exclude(source_url__isnull=True).exclude(source_url=''):
        knowledge.related_links = [{
            'title': '',
            'url': knowledge.source_url,
        }]
        knowledge.save(update_fields=['related_links'])


def migrate_related_links_to_source_url(apps, schema_editor):
    Knowledge = apps.get_model('knowledge', 'Knowledge')

    for knowledge in Knowledge.objects.all():
        related_links = knowledge.related_links or []
        first_url = ''
        if related_links:
            first_item = related_links[0] or {}
            first_url = first_item.get('url', '')
        knowledge.source_url = first_url or None
        knowledge.save(update_fields=['source_url'])


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0010_flatten_knowledge_tags'),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledge',
            name='related_links',
            field=models.JSONField(blank=True, default=list, help_text='相关资料链接列表，格式为 [{"title": "文档标题", "url": "https://example.com"}]', verbose_name='相关链接'),
        ),
        migrations.RunPython(
            migrate_source_url_to_related_links,
            migrate_related_links_to_source_url,
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='source_url',
        ),
    ]
