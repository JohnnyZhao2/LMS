from decimal import Decimal

from django.db import migrations, models


def backfill_submission_split_scores(apps, schema_editor):
    Submission = apps.get_model('submissions', 'Submission')
    Answer = apps.get_model('submissions', 'Answer')

    submitted_qs = Submission.objects.filter(status__in=['SUBMITTED', 'GRADING', 'GRADED'])
    buckets = {}
    for row in (
        Answer.objects.filter(submission__status__in=['SUBMITTED', 'GRADING', 'GRADED'])
        .values('submission_id', 'question__question_type')
        .annotate(
            cnt=models.Count('id'),
            score=models.Sum('obtained_score'),
        )
    ):
        sid = row['submission_id']
        bucket = buckets.setdefault(
            sid,
            {'obj_cnt': 0, 'obj_score': Decimal('0'), 'subj_cnt': 0, 'subj_score': Decimal('0')},
        )
        score = row['score'] or Decimal('0')
        if row['question__question_type'] == 'SHORT_ANSWER':
            bucket['subj_cnt'] += row['cnt']
            bucket['subj_score'] += score
        else:
            bucket['obj_cnt'] += row['cnt']
            bucket['obj_score'] += score

    to_update = []
    for sub in submitted_qs.only('id', 'status', 'objective_score', 'subjective_score'):
        bucket = buckets.get(sub.id)
        if not bucket:
            continue
        sub.objective_score = bucket['obj_score'] if bucket['obj_cnt'] else None
        sub.subjective_score = (
            bucket['subj_score'] if bucket['subj_cnt'] and sub.status != 'GRADING' else None
        )
        to_update.append(sub)

    if to_update:
        Submission.objects.bulk_update(to_update, ['objective_score', 'subjective_score'], batch_size=500)


class Migration(migrations.Migration):

    dependencies = [
        ('submissions', '0004_submission_uses_task_quiz'),
    ]

    operations = [
        migrations.AddField(
            model_name='submission',
            name='objective_score',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
                verbose_name='客观题得分',
            ),
        ),
        migrations.AddField(
            model_name='submission',
            name='subjective_score',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
                verbose_name='主观题得分',
            ),
        ),
        migrations.RunPython(backfill_submission_split_scores, migrations.RunPython.noop),
    ]
