from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0012_tag_color'),
        ('questions', '0010_question_tags_and_tag_app'),
        ('tags', '0002_add_scope_fields'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name='knowledge',
                    name='line_tag',
                    field=models.ForeignKey(
                        blank=True,
                        limit_choices_to={'is_active': True, 'tag_type': 'LINE'},
                        null=True,
                        on_delete=models.deletion.PROTECT,
                        related_name='knowledge_by_line',
                        to='tags.tag',
                        verbose_name='条线类型',
                    ),
                ),
                migrations.AlterField(
                    model_name='knowledge',
                    name='tags',
                    field=models.ManyToManyField(
                        blank=True,
                        limit_choices_to={'is_active': True, 'tag_type': 'TAG'},
                        related_name='knowledge_items',
                        to='tags.tag',
                        verbose_name='知识标签',
                    ),
                ),
                migrations.DeleteModel(name='Tag'),
            ],
        ),
    ]
