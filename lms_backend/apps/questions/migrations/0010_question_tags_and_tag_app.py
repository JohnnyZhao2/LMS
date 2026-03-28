from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0009_rename_line_type_to_line_tag'),
        ('tags', '0002_add_scope_fields'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.AlterField(
                    model_name='question',
                    name='line_tag',
                    field=models.ForeignKey(
                        blank=True,
                        limit_choices_to={'is_active': True, 'tag_type': 'LINE'},
                        null=True,
                        on_delete=models.deletion.PROTECT,
                        related_name='question_by_line',
                        to='tags.tag',
                        verbose_name='条线类型',
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name='question',
            name='tags',
            field=models.ManyToManyField(
                blank=True,
                limit_choices_to={'is_active': True, 'tag_type': 'TAG'},
                related_name='question_items',
                to='tags.tag',
                verbose_name='题目标签',
            ),
        ),
    ]
