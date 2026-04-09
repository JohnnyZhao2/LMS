import django.core.validators
import django.db.models.deletion
from django.db import migrations, models



def migrate_spot_check_items(apps, schema_editor):
    SpotCheck = apps.get_model('spot_checks', 'SpotCheck')
    SpotCheckItem = apps.get_model('spot_checks', 'SpotCheckItem')

    items_to_create = []
    for spot_check in SpotCheck.objects.all().iterator():
        items_to_create.append(
            SpotCheckItem(
                spot_check_id=spot_check.id,
                topic=spot_check.content[:120] if spot_check.content else '未命名主题',
                content=spot_check.content or '',
                score=spot_check.score,
                comment=spot_check.comment or '',
                order=0,
            )
        )

    if items_to_create:
        SpotCheckItem.objects.bulk_create(items_to_create)


class Migration(migrations.Migration):

    dependencies = [
        ('spot_checks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpotCheckItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('topic', models.CharField(max_length=120, verbose_name='抽查主题')),
                ('content', models.TextField(blank=True, default='', verbose_name='抽查内容')),
                ('score', models.DecimalField(decimal_places=2, max_digits=5, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(100)], verbose_name='评分')),
                ('comment', models.TextField(blank=True, default='', verbose_name='评语')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='排序')),
                ('spot_check', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='spot_checks.spotcheck', verbose_name='所属抽查记录')),
            ],
            options={
                'verbose_name': '抽查明细',
                'verbose_name_plural': '抽查明细',
                'db_table': 'lms_spot_check_item',
                'ordering': ['order', 'id'],
            },
        ),
        migrations.RunPython(migrate_spot_check_items, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='spotcheck',
            name='checked_at',
        ),
        migrations.RemoveField(
            model_name='spotcheck',
            name='comment',
        ),
        migrations.RemoveField(
            model_name='spotcheck',
            name='content',
        ),
        migrations.RemoveField(
            model_name='spotcheck',
            name='score',
        ),
        migrations.AlterModelOptions(
            name='spotcheck',
            options={'db_table': 'lms_spot_check', 'ordering': ['-created_at'], 'verbose_name': '抽查记录', 'verbose_name_plural': '抽查记录'},
        ),
    ]
