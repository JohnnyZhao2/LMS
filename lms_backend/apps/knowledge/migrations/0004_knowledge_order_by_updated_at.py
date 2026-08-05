from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0003_knowledge_iframe_fields'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='knowledge',
            options={
                'ordering': ['-updated_at', '-id'],
                'verbose_name': '知识文档',
                'verbose_name_plural': '知识文档',
            },
        ),
        migrations.AlterField(
            model_name='knowledge',
            name='related_links',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='相关资料链接列表，格式为 [{"title": "链接名称", "url": "https://example.com"}]',
                verbose_name='相关链接',
            ),
        ),
    ]
