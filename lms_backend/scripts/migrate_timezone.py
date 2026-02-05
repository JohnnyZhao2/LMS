"""
时区迁移脚本

将 USE_TZ=False 时存储的本地时间（Asia/Shanghai）转换为 UTC 时间。

使用方法：
    python manage.py shell < scripts/migrate_timezone.py

说明：
    之前 USE_TZ=False 时，数据库存储的是本地时间（无时区信息）。
    现在 USE_TZ=True 后，Django 会把数据库中的时间当作 UTC 时间。
    因此需要将所有时间减去 8 小时，把本地时间转换为对应的 UTC 时间。
"""
from datetime import timedelta
from django.db import connection, transaction

# 上海时区偏移量：+8 小时
# 需要减去 8 小时将本地时间转换为 UTC
OFFSET_HOURS = 8

# 需要迁移的模型和字段（表名和字段）
DATETIME_FIELDS = {
    # 用户相关
    'lms_user': ['last_login', 'created_at', 'updated_at'],
    'lms_department': ['created_at', 'updated_at'],
    'lms_user_role': ['created_at', 'updated_at'],
    
    # 知识相关
    'lms_knowledge': ['created_at', 'updated_at', 'deleted_at', 'published_at'],
    'lms_knowledge_learning_progress': ['created_at', 'updated_at', 'completed_at'],
    
    # 题库相关
    'lms_question': ['created_at', 'updated_at', 'deleted_at', 'published_at'],
    'lms_quiz': ['created_at', 'updated_at', 'deleted_at', 'published_at'],
    'lms_quiz_question': ['created_at', 'updated_at'],
    
    # 任务相关
    'lms_task': ['created_at', 'updated_at', 'deleted_at', 'deadline', 'closed_at'],
    'lms_task_assignment': ['created_at', 'updated_at', 'completed_at'],
    'lms_task_knowledge': ['created_at', 'updated_at'],
    'lms_task_quiz': ['created_at', 'updated_at'],
    
    # 答题相关
    'lms_submission': ['created_at', 'updated_at', 'started_at', 'submitted_at'],
    'lms_answer': ['created_at', 'updated_at', 'graded_at'],
    
    # 抽查相关
    'lms_spot_check': ['created_at', 'updated_at', 'deleted_at', 'checked_at'],
    
    # 日志相关
    'user_logs': ['created_at', 'updated_at'],
    'operation_logs': ['created_at'],
    'content_logs': ['created_at'],
    
    # 通知相关
    'lms_notification': ['created_at', 'updated_at'],
}


def get_existing_tables():
    """获取数据库中存在的表"""
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        return [row[0] for row in cursor.fetchall()]


def get_table_columns(table_name):
    """获取表中的列名"""
    with connection.cursor() as cursor:
        cursor.execute(f"DESCRIBE {table_name}")
        return [row[0] for row in cursor.fetchall()]


def migrate_table(table_name, fields):
    """迁移单个表的时间字段"""
    existing_tables = get_existing_tables()
    
    if table_name not in existing_tables:
        print(f"  跳过 {table_name}: 表不存在")
        return 0
    
    existing_columns = get_table_columns(table_name)
    valid_fields = [f for f in fields if f in existing_columns]
    
    if not valid_fields:
        print(f"  跳过 {table_name}: 无有效的时间字段")
        return 0
    
    # 构建 UPDATE SQL
    set_clauses = []
    for field in valid_fields:
        # 对于可空字段，需要检查是否为 NULL
        set_clauses.append(
            f"{field} = CASE WHEN {field} IS NOT NULL "
            f"THEN DATE_SUB({field}, INTERVAL {OFFSET_HOURS} HOUR) "
            f"ELSE NULL END"
        )
    
    sql = f"UPDATE {table_name} SET {', '.join(set_clauses)}"
    
    with connection.cursor() as cursor:
        cursor.execute(sql)
        affected = cursor.rowcount
    
    print(f"  ✓ {table_name}: 更新 {affected} 行, 字段: {', '.join(valid_fields)}")
    return affected


def main():
    print("=" * 60)
    print("时区数据迁移脚本")
    print("将本地时间（Asia/Shanghai，UTC+8）转换为 UTC 时间")
    print("=" * 60)
    print()
    
    total_affected = 0
    
    with transaction.atomic():
        for table_name, fields in DATETIME_FIELDS.items():
            affected = migrate_table(table_name, fields)
            total_affected += affected
    
    print()
    print("=" * 60)
    print(f"迁移完成！共更新 {total_affected} 行")
    print("=" * 60)


if __name__ == '__main__':
    main()
else:
    # 当通过 shell < script.py 执行时
    main()
