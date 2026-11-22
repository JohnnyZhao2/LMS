from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0005_submission_objective_and_subjective_scores'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='submission',
            index=models.Index(
                fields=['task_quiz', 'task_assignment', 'status', 'attempt_number'],
                name='idx_sub_quiz_assign_stat_att',
            ),
        ),
        migrations.AddIndex(
            model_name='submission',
            index=models.Index(
                fields=['task_quiz', 'status'],
                name='idx_sub_quiz_status',
            ),
        ),
        migrations.AddIndex(
            model_name='answer',
            index=models.Index(
                fields=['submission', 'graded_by'],
                name='idx_ans_sub_graded_by',
            ),
        ),
    ]
