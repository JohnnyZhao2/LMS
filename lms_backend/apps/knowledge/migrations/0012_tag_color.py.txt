from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0011_replace_source_url_with_related_links'),
    ]

    operations = [
        migrations.AddField(
            model_name='tag',
            name='color',
            field=models.CharField(default='#4A90E2', max_length=7, verbose_name='主题色'),
        ),
    ]
