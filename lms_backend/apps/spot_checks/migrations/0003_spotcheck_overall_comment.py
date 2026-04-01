from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spot_checks', '0002_refactor_spot_check_items'),
    ]

    operations = [
        migrations.AddField(
            model_name='spotcheck',
            name='overall_comment',
            field=models.TextField(blank=True, default='', verbose_name='综合评语'),
        ),
    ]
