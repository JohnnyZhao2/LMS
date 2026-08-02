from django.db import migrations, models
from django.db.models import Count


def assert_no_duplicate_names(apps, schema_editor):
    Tag = apps.get_model('tags', 'Tag')
    duplicates = list(
        Tag.objects.values('name')
        .annotate(cnt=Count('id'))
        .filter(cnt__gt=1)
        .values_list('name', flat=True)
    )
    if duplicates:
        raise RuntimeError(
            f'存在重复标签名，无法迁移为全局唯一: {", ".join(duplicates)}'
        )


class Migration(migrations.Migration):

    dependencies = [
        ('tags', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(assert_no_duplicate_names, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='tag',
            unique_together=set(),
        ),
        migrations.AlterField(
            model_name='tag',
            name='name',
            field=models.CharField(max_length=100, unique=True, verbose_name='标签名称'),
        ),
    ]
