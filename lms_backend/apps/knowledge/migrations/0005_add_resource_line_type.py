# Generated migration: Add ResourceLineType model and migrate existing line_type data
# Fixed version: Handle case where table already exists

from django.db import migrations, models, connection
import django.db.models.deletion


def check_table_exists(table_name):
    """检查表是否存在（支持 MySQL 和 SQLite）"""
    with connection.cursor() as cursor:
        vendor = connection.vendor
        if vendor == 'sqlite':
            cursor.execute("""
                SELECT COUNT(*) 
                FROM sqlite_master 
                WHERE type='table' AND name=?
            """, [table_name])
        else:  # MySQL/PostgreSQL
            db_name = connection.settings_dict['NAME']
            cursor.execute("""
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_schema = %s 
                AND table_name = %s
            """, [db_name, table_name])
        return cursor.fetchone()[0] > 0


def create_table_if_not_exists(apps, schema_editor):
    """如果表不存在则创建"""
    if not check_table_exists('lms_resource_line_type'):
        with connection.cursor() as cursor:
            cursor.execute("""
                CREATE TABLE lms_resource_line_type (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    created_at DATETIME(6) NOT NULL,
                    updated_at DATETIME(6) NOT NULL,
                    object_id INT UNSIGNED NOT NULL,
                    content_type_id INT NOT NULL,
                    line_type_id BIGINT NOT NULL,
                    FOREIGN KEY (content_type_id) REFERENCES django_content_type(id),
                    FOREIGN KEY (line_type_id) REFERENCES lms_tag(id),
                    UNIQUE KEY unique_resource_line_type (content_type_id, object_id, line_type_id),
                    INDEX lms_resour_content_idx (content_type_id, object_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """)


def migrate_line_type_to_resource_line_type(apps, schema_editor):
    """
    将现有 Knowledge 和 Question 的 line_type 数据迁移到 ResourceLineType 表
    """
    # 检查表是否存在
    if not check_table_exists('lms_resource_line_type'):
        return
    
    ResourceLineType = apps.get_model('knowledge', 'ResourceLineType')
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    Question = apps.get_model('questions', 'Question')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    
    # 获取 ContentType（使用 app_label 和 model）
    knowledge_content_type = ContentType.objects.get(
        app_label='knowledge',
        model='knowledge'
    )
    question_content_type = ContentType.objects.get(
        app_label='questions',
        model='question'
    )
    
    # 检查 Knowledge 模型是否还有 line_type 字段
    # 如果字段已删除，说明数据已经迁移过了
    knowledge_fields = [f.name for f in Knowledge._meta.get_fields()]
    if 'line_type' in knowledge_fields:
        # 迁移 Knowledge 的 line_type
        knowledge_with_line_type = Knowledge.objects.filter(line_type__isnull=False)
        for knowledge in knowledge_with_line_type:
            ResourceLineType.objects.get_or_create(
                content_type=knowledge_content_type,
                object_id=knowledge.id,
                line_type=knowledge.line_type,
                defaults={
                    'created_at': knowledge.created_at,
                    'updated_at': knowledge.updated_at,
                }
            )
    
    # 检查 Question 模型是否还有 line_type 字段
    question_fields = [f.name for f in Question._meta.get_fields()]
    if 'line_type' in question_fields:
        # 迁移 Question 的 line_type
        question_with_line_type = Question.objects.filter(line_type__isnull=False)
        for question in question_with_line_type:
            ResourceLineType.objects.get_or_create(
                content_type=question_content_type,
                object_id=question.id,
                line_type=question.line_type,
                defaults={
                    'created_at': question.created_at,
                    'updated_at': question.updated_at,
                }
            )


def reverse_migrate_line_type(apps, schema_editor):
    """
    反向迁移：从 ResourceLineType 恢复 line_type 字段
    """
    ResourceLineType = apps.get_model('knowledge', 'ResourceLineType')
    Knowledge = apps.get_model('knowledge', 'Knowledge')
    Question = apps.get_model('questions', 'Question')
    ContentType = apps.get_model('contenttypes', 'ContentType')
    
    # 获取 ContentType（使用 app_label 和 model）
    knowledge_content_type = ContentType.objects.get(
        app_label='knowledge',
        model='knowledge'
    )
    question_content_type = ContentType.objects.get(
        app_label='questions',
        model='question'
    )
    
    # 恢复 Knowledge 的 line_type（如果字段还存在）
    knowledge_fields = [f.name for f in Knowledge._meta.get_fields()]
    if 'line_type' in knowledge_fields:
        knowledge_relations = ResourceLineType.objects.filter(content_type=knowledge_content_type)
        for relation in knowledge_relations:
            try:
                knowledge = Knowledge.objects.get(id=relation.object_id)
                knowledge.line_type = relation.line_type
                knowledge.save(update_fields=['line_type'])
            except Knowledge.DoesNotExist:
                pass
    
    # 恢复 Question 的 line_type（如果字段还存在）
    question_fields = [f.name for f in Question._meta.get_fields()]
    if 'line_type' in question_fields:
        question_relations = ResourceLineType.objects.filter(content_type=question_content_type)
        for relation in question_relations:
            try:
                question = Question.objects.get(id=relation.object_id)
                question.line_type = relation.line_type
                question.save(update_fields=['line_type'])
            except Question.DoesNotExist:
                pass


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('knowledge', '0004_add_published_version'),
        ('questions', '0001_question_models'),
    ]

    operations = [
        # 使用 SeparateDatabaseAndState 来处理表已存在的情况
        migrations.SeparateDatabaseAndState(
            # 数据库操作：只在表不存在时创建
            database_operations=[
                migrations.RunPython(
                    create_table_if_not_exists,
                    migrations.RunPython.noop,
                ),
            ],
            # 状态操作：更新 Django 模型状态
            state_operations=[
                migrations.CreateModel(
                    name='ResourceLineType',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='创建时间')),
                        ('updated_at', models.DateTimeField(auto_now=True, verbose_name='更新时间')),
                        ('object_id', models.PositiveIntegerField(verbose_name='资源ID')),
                        ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.contenttype', verbose_name='资源类型')),
                        ('line_type', models.ForeignKey(limit_choices_to={'is_active': True, 'tag_type': 'LINE'}, on_delete=django.db.models.deletion.PROTECT, related_name='resource_line_types', to='knowledge.tag', verbose_name='条线类型')),
                    ],
                    options={
                        'verbose_name': '资源条线类型',
                        'verbose_name_plural': '资源条线类型',
                        'db_table': 'lms_resource_line_type',
                    },
                ),
                migrations.AddIndex(
                    model_name='resourcelinetype',
                    index=models.Index(fields=['content_type', 'object_id'], name='lms_resour_content_idx'),
                ),
                migrations.AlterUniqueTogether(
                    name='resourcelinetype',
                    unique_together={('content_type', 'object_id', 'line_type')},
                ),
            ],
        ),
        # 迁移现有数据
        migrations.RunPython(
            migrate_line_type_to_resource_line_type,
            reverse_migrate_line_type,
        ),
    ]

