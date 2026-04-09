from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0010_question_tags_and_tag_app'),
        ('tags', '0003_rename_line_to_space'),
    ]

    operations = [
        migrations.RenameField(
            model_name='question',
            old_name='line_tag',
            new_name='space_tag',
        ),
        migrations.AlterField(
            model_name='question',
            name='space_tag',
            field=models.ForeignKey(
                blank=True,
                limit_choices_to={'is_active': True, 'tag_type': 'SPACE'},
                null=True,
                on_delete=models.deletion.PROTECT,
                related_name='question_by_space',
                to='tags.tag',
                verbose_name='space',
            ),
        ),
    ]
