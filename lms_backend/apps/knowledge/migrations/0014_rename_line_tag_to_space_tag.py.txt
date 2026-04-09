from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0013_move_tag_to_tags_app'),
        ('tags', '0003_rename_line_to_space'),
    ]

    operations = [
        migrations.RenameField(
            model_name='knowledge',
            old_name='line_tag',
            new_name='space_tag',
        ),
        migrations.AlterField(
            model_name='knowledge',
            name='space_tag',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'is_active': True, 'tag_type': 'SPACE'},
                null=True,
                on_delete=models.deletion.PROTECT,
                related_name='knowledge_by_space',
                to='tags.tag',
                verbose_name='space',
            ),
        ),
    ]
