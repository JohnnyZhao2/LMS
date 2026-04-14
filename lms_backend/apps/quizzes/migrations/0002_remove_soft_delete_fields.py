from django.db import migrations


def purge_soft_deleted_quizzes(apps, schema_editor):
    Quiz = apps.get_model('quizzes', 'Quiz')
    Quiz.objects.filter(is_deleted=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('quizzes', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(
            purge_soft_deleted_quizzes,
            migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name='quiz',
            name='deleted_at',
        ),
        migrations.RemoveField(
            model_name='quiz',
            name='is_deleted',
        ),
    ]
