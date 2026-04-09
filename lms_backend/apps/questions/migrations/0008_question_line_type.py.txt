from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0006_alter_knowledge_is_current_and_more'),
        ('questions', '0007_add_updated_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='line_type',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'is_active': True, 'tag_type': 'LINE'},
                null=True,
                on_delete=models.deletion.PROTECT,
                related_name='question_by_line',
                to='knowledge.tag',
                verbose_name='条线类型',
            ),
        ),
    ]
