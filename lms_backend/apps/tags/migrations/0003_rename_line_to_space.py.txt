from django.db import migrations, models


def rename_line_to_space(apps, schema_editor):
    Tag = apps.get_model('tags', 'Tag')
    Tag.objects.filter(tag_type='LINE').update(tag_type='SPACE')


def rename_space_to_line(apps, schema_editor):
    Tag = apps.get_model('tags', 'Tag')
    Tag.objects.filter(tag_type='SPACE').update(tag_type='LINE')


class Migration(migrations.Migration):

    dependencies = [
        ('tags', '0002_add_scope_fields'),
    ]

    operations = [
        migrations.RunPython(rename_line_to_space, rename_space_to_line),
        migrations.AlterField(
            model_name='tag',
            name='tag_type',
            field=models.CharField(
                choices=[('SPACE', 'space'), ('TAG', '知识标签')],
                max_length=20,
                verbose_name='标签类型',
            ),
        ),
    ]
