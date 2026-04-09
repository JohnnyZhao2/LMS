from django.db import migrations, models


def migrate_to_flat_tags(apps, schema_editor):
    Tag = apps.get_model('knowledge', 'Tag')
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    db_alias = schema_editor.connection.alias

    # 以标签名作为唯一语义键，合并 SYSTEM/OPERATION 到统一 TAG。
    canonical_tag_id_by_name = {
        tag.name: tag.id
        for tag in Tag.objects.using(db_alias).filter(tag_type='TAG').order_by('id')
    }

    source_tags = list(
        Tag.objects.using(db_alias)
        .filter(tag_type__in=['SYSTEM', 'OPERATION'])
        .order_by('id')
    )
    source_to_target = {}
    tags_to_convert = []
    tags_to_delete = []

    for tag in source_tags:
        canonical_id = canonical_tag_id_by_name.get(tag.name)
        if canonical_id is None:
            canonical_tag_id_by_name[tag.name] = tag.id
            source_to_target[tag.id] = tag.id
            tags_to_convert.append(tag.id)
            continue

        source_to_target[tag.id] = canonical_id
        tags_to_delete.append(tag.id)

    if tags_to_convert:
        Tag.objects.using(db_alias).filter(id__in=tags_to_convert).update(
            tag_type='TAG',
            parent=None,
        )

    for knowledge in Knowledge.objects.using(db_alias).all().iterator():
        merged_tag_ids = []
        seen_ids = set()

        for tag in knowledge.system_tags.all():
            target_id = source_to_target.get(tag.id, tag.id)
            if target_id in seen_ids:
                continue
            seen_ids.add(target_id)
            merged_tag_ids.append(target_id)

        for tag in knowledge.operation_tags.all():
            target_id = source_to_target.get(tag.id, tag.id)
            if target_id in seen_ids:
                continue
            seen_ids.add(target_id)
            merged_tag_ids.append(target_id)

        knowledge.tags.set(merged_tag_ids)

    if tags_to_delete:
        Tag.objects.using(db_alias).filter(id__in=tags_to_delete).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('knowledge', '0009_unify_knowledge_content'),
    ]

    operations = [
        migrations.AddField(
            model_name='knowledge',
            name='tags',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'is_active': True, 'tag_type': 'TAG'},
                related_name='knowledge_items',
                to='knowledge.tag',
                verbose_name='知识标签',
            ),
        ),
        migrations.RunPython(
            code=migrate_to_flat_tags,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='operation_tags',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='system_tags',
        ),
        migrations.RemoveField(
            model_name='tag',
            name='parent',
        ),
        migrations.AlterField(
            model_name='tag',
            name='tag_type',
            field=models.CharField(
                choices=[('LINE', '条线类型'), ('TAG', '知识标签')],
                max_length=20,
                verbose_name='标签类型',
            ),
        ),
    ]
