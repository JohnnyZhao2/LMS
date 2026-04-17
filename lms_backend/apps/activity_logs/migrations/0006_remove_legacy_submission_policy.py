from django.db import migrations


def remove_legacy_submission_policy(apps, schema_editor):
    ActivityLogPolicy = apps.get_model('activity_logs', 'ActivityLogPolicy')
    ActivityLogPolicy.objects.filter(key='operation.submission.submit').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logs', '0005_refactor_to_unified_activity_log'),
    ]

    operations = [
        migrations.RunPython(remove_legacy_submission_policy, migrations.RunPython.noop),
    ]
