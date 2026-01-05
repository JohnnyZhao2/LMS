#!/usr/bin/env python
"""
同步测试数据脚本
从本地数据库同步最新数据到测试数据库
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


def sync_data():
    """同步数据"""
    print("🔄 同步测试数据...")
    
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='15572353184',
        charset='utf8mb4'
    )
    
    try:
        with connection.cursor() as cursor:
            # 清空测试数据库的数据（保留结构）
            print("  → 清空旧数据...")
            tables = [
                'lms_answer',
                'lms_submission',
                'lms_task_assignment',
                'lms_task_knowledge',
                'lms_task_quiz',
                'lms_task',
                'lms_quiz_question',
                'lms_quiz',
                'lms_question',
                'lms_knowledge_learning_progress',
                'lms_knowledge_operation_tags',
                'lms_knowledge_system_tags',
                'lms_knowledge',
                'lms_user_role',
                'lms_user',
            ]
            
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in tables:
                try:
                    cursor.execute(f"TRUNCATE TABLE lms_test.{table}")
                except Exception as e:
                    print(f"    ⚠️  清空 {table} 失败: {e}")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            
            # 复制最新数据
            print("  → 复制最新数据...")
            
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # 用户
            cursor.execute("""
                INSERT INTO lms_test.lms_user 
                SELECT * FROM lms.lms_user 
                LIMIT 10
            """)
            
            # 用户角色
            cursor.execute("""
                INSERT INTO lms_test.lms_user_role 
                SELECT ur.* FROM lms.lms_user_role ur
                WHERE ur.user_id IN (
                    SELECT id FROM lms_test.lms_user
                )
            """)
            
            # 知识文档
            cursor.execute("""
                INSERT INTO lms_test.lms_knowledge 
                SELECT * FROM lms.lms_knowledge 
                LIMIT 20
            """)
            
            # 题目
            cursor.execute("""
                INSERT INTO lms_test.lms_question 
                SELECT * FROM lms.lms_question 
                LIMIT 30
            """)
            
            # 试卷
            cursor.execute("""
                INSERT INTO lms_test.lms_quiz 
                SELECT * FROM lms.lms_quiz 
                LIMIT 5
            """)
            
            # 试卷题目
            cursor.execute("""
                INSERT INTO lms_test.lms_quiz_question 
                SELECT qq.* FROM lms.lms_quiz_question qq
                WHERE qq.quiz_id IN (
                    SELECT id FROM lms_test.lms_quiz
                )
            """)
            
            # 任务
            cursor.execute("""
                INSERT INTO lms_test.lms_task 
                SELECT * FROM lms.lms_task 
                LIMIT 10
            """)
            
            # 任务分配
            cursor.execute("""
                INSERT INTO lms_test.lms_task_assignment 
                SELECT ta.* FROM lms.lms_task_assignment ta
                WHERE ta.task_id IN (
                    SELECT id FROM lms_test.lms_task
                )
            """)
            
            # 提交记录
            cursor.execute("""
                INSERT INTO lms_test.lms_submission 
                SELECT * FROM lms.lms_submission 
                LIMIT 20
            """)
            
            # 答案
            cursor.execute("""
                INSERT INTO lms_test.lms_answer 
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
            
            print(f"  ✓ 同步完成")
            print(f"    - 用户: {stats[0]}")
            print(f"    - 知识: {stats[1]}")
            print(f"    - 题目: {stats[2]}")
            print(f"    - 试卷: {stats[3]}")
            print(f"    - 任务: {stats[4]}")
            print(f"    - 提交: {stats[5]}")
        
        connection.commit()
    except Exception as e:
        print(f"  ❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        connection.close()


def main():
    """主函数"""
    print("=" * 60)
    print("🔄 同步测试数据")
    print("=" * 60)
    
    sync_data()
    
    print("\n✅ 同步完成！")
    print()


if __name__ == '__main__':
    main()
