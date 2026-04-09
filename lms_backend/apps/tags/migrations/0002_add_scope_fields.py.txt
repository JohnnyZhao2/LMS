from django.db import migrations, models


def backfill_tag_scopes(apps, schema_editor):
    Tag = apps.get_model('tags', 'Tag')
    Tag.objects.filter(tag_type='LINE').update(
        allow_knowledge=True,
        allow_question=True,
    )
    Tag.objects.filter(tag_type='TAG').update(
        allow_knowledge=True,
        allow_question=False,
    )


def reset_tag_scopes(apps, schema_editor):
    Tag = apps.get_model('tags', 'Tag')
    Tag.objects.update(allow_question=False)


class Migration(migrations.Migration):

    dependencies = [
        ('tags', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='tag',
            name='allow_knowledge',
            field=models.BooleanField(default=True, verbose_name='适用于知识'),
        ),
        migrations.AddField(
            model_name='tag',
            name='allow_question',
            field=models.BooleanField(default=False, verbose_name='适用于题目'),
        ),
        migrations.RunPython(backfill_tag_scopes, reset_tag_scopes),
    ]
