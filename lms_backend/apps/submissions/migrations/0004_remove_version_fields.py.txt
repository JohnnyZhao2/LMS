# Generated migration to remove redundant version fields
# FK already points to specific version, no need for separate uuid/version_number

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0003_populate_version_data'),
    ]

    operations = [
        # Remove indexes first
        migrations.RemoveIndex(
            model_name='answer',
            name='idx_answer_question_version',
        ),
        migrations.RemoveIndex(
            model_name='submission',
            name='idx_submission_quiz_version',
        ),
        # Then remove fields
        migrations.RemoveField(
            model_name='answer',
            name='question_resource_uuid',
        ),
        migrations.RemoveField(
            model_name='answer',
            name='question_version_number',
        ),
        migrations.RemoveField(
            model_name='submission',
            name='quiz_resource_uuid',
        ),
        migrations.RemoveField(
            model_name='submission',
            name='quiz_version_number',
        ),
    ]
