from django.db import migrations


LEGACY_MODELS_BY_APP = {
    'authorization': (
        'permission',
        'rolepermission',
        'userpermission',
        'userpermissionoverride',
        'userscopegroupoverride',
    ),
    'knowledge': ('knowledgesettings',),
    'users': ('role', 'userrole'),
}


def remove_legacy_content_types(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    for app_label, model_names in LEGACY_MODELS_BY_APP.items():
        ContentType.objects.filter(
            app_label=app_label,
            model__in=model_names,
        ).delete()


class Migration(migrations.Migration):
    dependencies = [('authorization', '0030_clear_student_group_permissions')]
    operations = [
        migrations.RunPython(remove_legacy_content_types, migrations.RunPython.noop),
    ]
