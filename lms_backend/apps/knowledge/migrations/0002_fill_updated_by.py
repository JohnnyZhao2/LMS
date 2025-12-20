# Generated migration to fill updated_by field

from django.db import migrations, models


def fill_updated_by(apps, schema_editor):
    """
    将现有知识文档的 updated_by 字段填充为 created_by
    """
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    
    # 更新所有 updated_by 为空的记录
    # 使用数据库字段名 updated_by_id 和 created_by_id
    Knowledge.objects.filter(updated_by_id__isnull=True).update(
        updated_by_id=models.F('created_by_id')
    )


def reverse_fill_updated_by(apps, schema_editor):
    """
    反向操作：将 updated_by 设置为 None（如果需要回滚）
    """
    # 这里不需要做任何操作，因为原始数据可能本来就是 None
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('knowledge', '0001_initial_with_tags'),
    ]

    operations = [
        migrations.RunPython(fill_updated_by, reverse_fill_updated_by),
    ]

