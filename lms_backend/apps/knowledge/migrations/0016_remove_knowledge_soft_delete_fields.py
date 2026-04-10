from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0015_alter_knowledge_space_tag_alter_knowledge_tags'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='knowledge',
            name='deleted_at',
        ),
        migrations.RemoveField(
            model_name='knowledge',
            name='is_deleted',
        ),
    ]
