from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logs', '0002_initial'),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name='activitylogpolicy',
            name='activity_log_policy_key_idx',
        ),
    ]
