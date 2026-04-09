from django.db import migrations


def drop_legacy_management_profile_column(apps, schema_editor):
    table_name = 'lms_user'
    column_name = 'management_profile'
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = %s
              AND COLUMN_NAME = %s
            """,
            [table_name, column_name],
        )
        exists = cursor.fetchone()[0] > 0
        if exists:
            cursor.execute(f'ALTER TABLE `{table_name}` DROP COLUMN `{column_name}`')


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_backfill_student_role_for_admin_users'),
    ]

    operations = [
        migrations.RunPython(
            drop_legacy_management_profile_column,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
