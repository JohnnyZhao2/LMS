from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('quizzes', '0005_collapse_legacy_quiz_versions'),
    ]

    operations = [
        migrations.AlterField(
            model_name='quizquestion',
            name='score',
            field=models.DecimalField(decimal_places=2, default=5.0, max_digits=5, verbose_name='分值'),
        ),
        migrations.AlterField(
            model_name='quizrevisionquestion',
            name='score',
            field=models.DecimalField(decimal_places=2, default=5.0, max_digits=5, verbose_name='分值'),
        ),
    ]
