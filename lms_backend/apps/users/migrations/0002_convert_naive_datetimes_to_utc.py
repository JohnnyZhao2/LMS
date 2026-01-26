from django.db import migrations, models
from django.utils import timezone


def convert_naive_datetimes_to_utc(apps, schema_editor):
    tz = timezone.get_current_timezone()
    for model in apps.get_models():
        dt_fields = [
            field for field in model._meta.concrete_fields
            if isinstance(field, models.DateTimeField)
        ]
        if not dt_fields:
            continue
        field_names = [field.name for field in dt_fields]
        queryset = model.objects.all().only('pk', *field_names)
        for obj in queryset.iterator():
            updates = {}
            for field in dt_fields:
                value = getattr(obj, field.name)
                if value is None:
                    continue
                if timezone.is_naive(value):
                    aware_value = timezone.make_aware(value, tz)
                else:
                    aware_value = value
                updates[field.name] = aware_value.astimezone(timezone.utc)
            if updates:
                model.objects.filter(pk=obj.pk).update(**updates)


class Migration(migrations.Migration):

    dependencies = [
        ('activity_logs', '0002_activity_log_policy'),
        ('knowledge', '0004_remove_knowledge_source_version'),
        ('questions', '0007_add_updated_by'),
        ('quizzes', '0006_add_updated_by'),
        ('spot_checks', '0001_initial'),
        ('submissions', '0004_remove_version_fields'),
        ('tasks', '0004_add_updated_by'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(convert_naive_datetimes_to_utc, migrations.RunPython.noop),
    ]
