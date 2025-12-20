# Generated migration: Remove line_type field from Question model (database column only)

from django.db import migrations, connection


def drop_line_type_column(apps, schema_editor):
    """
    如果 lms_question 表中仍然存在 line_type_id 列，则删除
    """
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'lms_question'
              AND column_name = 'line_type_id'
            """
        )
        column_exists = cursor.fetchone()[0] > 0
    
        if column_exists:
            cursor.execute("ALTER TABLE lms_question DROP COLUMN line_type_id;")


class Migration(migrations.Migration):

    dependencies = [
        ('questions', '0001_question_models'),
        ('knowledge', '0005_add_resource_line_type'),  # 确保 ResourceLineType 表已创建
    ]

    operations = [
        migrations.RunPython(
            drop_line_type_column,
            migrations.RunPython.noop,
        ),
    ]

