#!/usr/bin/env python
"""
设置测试数据库脚本
- 创建 lms_test 数据库
- 运行所有迁移
- 从本地数据库复制测试数据
"""
import os
import sys
import django
from pathlib import Path

# 添加项目路径
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# 设置 Django 环境
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

import pymysql
from django.core.management import call_command
from django.conf import settings


def create_test_database():
    """创建测试数据库"""
    print("📦 创建测试数据库...")
    
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='15572353184',
        charset='utf8mb4'
    )
    
    try:
        with connection.cursor() as cursor:
            # 删除旧的测试数据库（如果存在）
            cursor.execute("DROP DATABASE IF EXISTS lms_test")
            print("  ✓ 删除旧数据库")
            
            # 创建新的测试数据库
            cursor.execute(
                "CREATE DATABASE lms_test "
                "CHARACTER SET utf8mb4 "
                "COLLATE utf8mb4_unicode_ci"
            )
            print("  ✓ 创建新数据库 lms_test")
        
        connection.commit()
    finally:
        connection.close()


def run_migrations():
    """运行数据库迁移"""
    print("\n🔄 运行数据库迁移...")
    
    # 使用 --database 参数指定测试数据库
    # 需要先手动更新 settings 中的数据库配置
    from django.conf import settings
    settings.DATABASES['default']['NAME'] = 'lms_test'
    
    call_command('migrate', '--noinput', verbosity=1)
    print("  ✓ 迁移完成")


def copy_test_data():
    """从本地数据库复制测试数据"""
    print("\n📋 复制测试数据...")
    
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='15572353184',
        charset='utf8mb4'
    )
    
    try:
        with connection.cursor() as cursor:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # 复制用户数据
            print("  → 复制用户数据...")
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_user 
                SELECT * FROM lms.lms_user 
                LIMIT 10
            """)
            
            # 复制用户角色关联
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_user_role 
                SELECT ur.* FROM lms.lms_user_role ur
                WHERE ur.user_id IN (
                    SELECT id FROM lms_test.lms_user
                )
            """)
            
            # 复制知识文档
            print("  → 复制知识文档...")
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_knowledge 
                SELECT * FROM lms.lms_knowledge 
                LIMIT 20
            """)
            
            # 复制题目
            print("  → 复制题目...")
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_question 
                SELECT * FROM lms.lms_question 
                LIMIT 30
            """)
            
            # 复制试卷
            print("  → 复制试卷...")
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_quiz 
                SELECT * FROM lms.lms_quiz 
                LIMIT 5
            """)
            
            # 复制试卷题目关联
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_quiz_question 
                SELECT qq.* FROM lms.lms_quiz_question qq
                WHERE qq.quiz_id IN (
                    SELECT id FROM lms_test.lms_quiz
                )
            """)
            
            # 复制任务
            print("  → 复制任务...")
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_task 
                SELECT * FROM lms.lms_task 
                LIMIT 10
            """)
            
            # 复制任务分配
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_task_assignment 
                SELECT ta.* FROM lms.lms_task_assignment ta
                WHERE ta.task_id IN (
                    SELECT id FROM lms_test.lms_task
                )
            """)
            
            # 复制提交记录
            print("  → 复制提交记录...")
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_submission 
                SELECT * FROM lms.lms_submission 
                LIMIT 20
            """)
            
            # 复制答案记录
            cursor.execute("""
                INSERT IGNORE INTO lms_test.lms_answer 
                SELECT a.* FROM lms.lms_answer a
                WHERE a.submission_id IN (
                    SELECT id FROM lms_test.lms_submission
                )
            """)
            
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            # 显示统计
            cursor.execute("""
                SELECT 
                  (SELECT COUNT(*) FROM lms_test.lms_user) as users,
                  (SELECT COUNT(*) FROM lms_test.lms_knowledge) as knowledge,
                  (SELECT COUNT(*) FROM lms_test.lms_question) as questions,
                  (SELECT COUNT(*) FROM lms_test.lms_quiz) as quizzes,
                  (SELECT COUNT(*) FROM lms_test.lms_task) as tasks,
                  (SELECT COUNT(*) FROM lms_test.lms_submission) as submissions
            """)
            stats = cursor.fetchone()
            
            print(f"  ✓ 数据复制完成")
            print(f"    - 用户: {stats[0]}")
            print(f"    - 知识: {stats[1]}")
            print(f"    - 题目: {stats[2]}")
            print(f"    - 试卷: {stats[3]}")
            print(f"    - 任务: {stats[4]}")
            print(f"    - 提交: {stats[5]}")
        
        connection.commit()
    except Exception as e:
        print(f"  ⚠️  复制数据时出现错误: {e}")
        print("  → 这可能是因为本地数据库还没有数据，跳过...")
    finally:
        connection.close()


def main():
    """主函数"""
    print("=" * 60)
    print("🚀 设置测试数据库")
    print("=" * 60)
    
    try:
        # 1. 创建测试数据库
        create_test_database()
        
        # 2. 运行迁移
        run_migrations()
        
        # 3. 复制测试数据
        copy_test_data()
        
        print("\n" + "=" * 60)
        print("✅ 测试数据库设置完成！")
        print("=" * 60)
        print("\n📝 使用说明：")
        print("  • 测试数据库名称: lms_test")
        print("  • 运行测试: pytest")
        print("  • 重新设置: python scripts/setup_test_db.py")
        print()
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
