from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0005_collapse_legacy_question_versions'),
    ]

    operations = [
        migrations.AlterField(
            model_name='question',
            name='score',
            field=models.DecimalField(decimal_places=2, default=5.0, max_digits=5, verbose_name='分值'),
        ),
    ]
