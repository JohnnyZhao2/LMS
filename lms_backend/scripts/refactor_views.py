#!/usr/bin/env python3
"""
View 层构造器注入改造脚本

功能：
1. 分析所有 View 文件，找出使用 Service 的地方
2. 生成改造建议

使用方式：
    python scripts/refactor_views.py
"""
import os
import re
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APPS_DIR = BASE_DIR / 'apps'

# 需要改造的 Service 类名
SERVICE_CLASSES = [
    'SpotCheckService',
    'MentorDashboardService',
    'KnowledgeService',
    'QuestionService',
    'QuizService',
    'TaskService',
    'StudentTaskService',
]


def find_view_files():
    """查找所有 View 文件"""
    view_files = []
    for root, dirs, files in os.walk(APPS_DIR):
        for file in files:
            if file.endswith('views.py') or (file.endswith('.py') and 'views' in root):
                filepath = Path(root) / file
                view_files.append(filepath)
    return view_files


def analyze_view_file(filepath):
    """分析单个 View 文件"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    result = {
        'file': str(filepath),
        'needs_refactor': False,
        'service_usage': [],
        'has_base_api_view': 'BaseAPIView' in content,
    }
    
    # 检查是否使用了需要改造的 Service
    for service_class in SERVICE_CLASSES:
        if f'{service_class}()' in content:
            result['needs_refactor'] = True
            result['service_usage'].append(service_class)
    
    return result


def main():
    print("🔍 正在分析 View 文件...")
    view_files = find_view_files()
    
    needs_refactor = []
    already_done = []
    
    for filepath in view_files:
        result = analyze_view_file(filepath)
        if result['needs_refactor']:
            if not result['has_base_api_view']:
                needs_refactor.append(result)
            else:
                already_done.append(result)
    
    print("\n" + "=" * 70)
    print("📊 View 层改造分析报告")
    print("=" * 70)
    
    if already_done:
        print(f"\n✅ 已完成改造的 View 文件: {len(already_done)}")
        for item in already_done:
            print(f"  - {item['file']}")
            for service in item['service_usage']:
                print(f"      使用: {service}")
    
    if needs_refactor:
        print(f"\n⚠️  需要改造的 View 文件: {len(needs_refactor)}")
        for item in needs_refactor:
            print(f"\n📁 {item['file']}")
            for service in item['service_usage']:
                print(f"  🔸 使用: {service}")
            print(f"  📝 改造建议:")
            print(f"     1. 导入: from core.base_view import BaseAPIView")
            print(f"     2. 继承: class XxxView(BaseAPIView)")
            print(f"     3. 添加: service_class = {item['service_usage'][0]}")
            print(f"     4. 移除: __init__ 中的 self.service = ...")
            print(f"     5. 更新调用: self.service.method() 不再传 user/request")
    
    print("\n" + "=" * 70)
    print(f"📈 总计:")
    print(f"   ✅ 已完成: {len(already_done)}")
    print(f"   ⚠️  待改造: {len(needs_refactor)}")
    print("=" * 70)
    
    if needs_refactor:
        print("\n💡 建议手动改造以下文件（按优先级）:")
        priority_order = [
            'knowledge/views',
            'questions/views',
            'quizzes/views',
            'tasks/views',
        ]
        for pattern in priority_order:
            matching = [r for r in needs_refactor if pattern in r['file']]
            if matching:
                print(f"\n  📌 {pattern}:")
                for item in matching:
                    print(f"     - {os.path.basename(item['file'])}")


if __name__ == '__main__':
    main()
