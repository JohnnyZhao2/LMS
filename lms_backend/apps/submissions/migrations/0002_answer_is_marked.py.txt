from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='answer',
            name='is_marked',
            field=models.BooleanField(default=False, verbose_name='是否标记'),
        ),
    ]
