from collections import defaultdict
import uuid

from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def populate_knowledge_version_fields(apps, schema_editor):
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    db_alias = schema_editor.connection.alias

    base_qs = Knowledge.objects.using(db_alias).filter(published_version__isnull=True)
    for knowledge in base_qs.iterator():
        if not knowledge.resource_uuid:
            knowledge.resource_uuid = uuid.uuid4()
        knowledge.version_number = knowledge.version_number or 1
        knowledge.source_version_id = None
        if knowledge.status == 'PUBLISHED' and not knowledge.is_deleted:
            knowledge.is_current = True
            if not knowledge.published_at:
                knowledge.published_at = knowledge.updated_at or knowledge.created_at or timezone.now()
        else:
            knowledge.is_current = False
            knowledge.published_at = None
        knowledge.save(
            update_fields=[
                'resource_uuid',
                'version_number',
                'source_version',
                'is_current',
                'published_at',
            ]
        )

    counters = defaultdict(int)
    draft_qs = Knowledge.objects.using(db_alias).filter(published_version__isnull=False)
    for draft in draft_qs.iterator():
        base = draft.published_version
        if base:
            if not base.resource_uuid:
                base.resource_uuid = uuid.uuid4()
                base.save(update_fields=['resource_uuid'])
            counters[base.id] += 1
            draft.resource_uuid = base.resource_uuid
            draft.source_version_id = base.id
            draft.version_number = (base.version_number or 1) + counters[base.id]
            draft.is_current = False
            draft.published_at = None
        else:
            draft.source_version_id = None
            if not draft.resource_uuid:
                draft.resource_uuid = uuid.uuid4()
            draft.version_number = draft.version_number or 1
            draft.is_current = draft.status == 'PUBLISHED' and not draft.is_deleted
            if draft.is_current and not draft.published_at:
                draft.published_at = draft.updated_at or draft.created_at or timezone.now()
        draft.save(
            update_fields=[
                'resource_uuid',
                'version_number',
                'source_version',
                'is_current',
                'published_at',
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0006_remove_knowledge_line_type_field'),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledge',
            name='resource_uuid',
            field=models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, verbose_name='资源标识'),
        ),
        migrations.AddField(
            model_name='knowledge',
            name='version_number',
            field=models.PositiveIntegerField(default=1, help_text='同一资源的累积版本序号', verbose_name='版本号'),
        ),
        migrations.AddField(
            model_name='knowledge',
            name='source_version',
            field=models.ForeignKey(blank=True, help_text='从该已发布版本衍生出来的草稿', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='derived_versions', to='knowledge.knowledge', verbose_name='来源版本'),
        ),
        migrations.AddField(
            model_name='knowledge',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='发布时间'),
        ),
        migrations.AddField(
            model_name='knowledge',
            name='is_current',
            field=models.BooleanField(default=False, verbose_name='是否当前最新发布版本'),
        ),
        migrations.RunPython(populate_knowledge_version_fields, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='knowledge',
            name='published_version',
        ),
        migrations.AddConstraint(
            model_name='knowledge',
            constraint=models.UniqueConstraint(fields=('resource_uuid', 'version_number'), name='uniq_knowledge_resource_version'),
        ),
    ]

