from django.db import migrations


def drop_overall_comment_column(apps, schema_editor):
    table_name = 'lms_spot_check'
    column_name = 'overall_comment'
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
        ('spot_checks', '0003_spotcheck_overall_comment'),
    ]

    operations = [
        migrations.RunPython(
            drop_overall_comment_column,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
