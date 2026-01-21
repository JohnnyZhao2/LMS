#!/usr/bin/env python3
"""
Service 层构造器注入改造脚本

功能：
1. 分析所有 Service 文件，找出需要改造的方法
2. 生成改造报告
3. 自动替换简单的模式

使用方式：
    python scripts/refactor_services.py --analyze   # 分析模式
    python scripts/refactor_services.py --refactor  # 执行改造
"""
import os
import re
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
APPS_DIR = BASE_DIR / 'apps'

# 需要改造的 Service 文件
SERVICE_FILES = [
    'dashboard/services.py',
    'knowledge/services.py',
    'questions/services.py',
    'quizzes/services.py',
    'tasks/services.py',
]

# 不需要改造的 Service（不使用 request）
SKIP_SERVICES = [
    'auth/services.py',
    'users/services.py',
    'submissions/services.py',
]


def analyze_file(filepath):
    """分析单个文件，找出需要改造的方法"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    results = {
        'file': str(filepath),
        'methods_with_user': [],
        'methods_with_request': [],
        'get_current_role_calls': [],
        'get_accessible_students_calls': [],
    }
    
    # 查找带 user 参数的方法
    user_pattern = r'def\s+(\w+)\s*\([^)]*\buser\b[^)]*\)'
    for match in re.finditer(user_pattern, content):
        results['methods_with_user'].append(match.group(1))
    
    # 查找带 request 参数的方法
    request_pattern = r'def\s+(\w+)\s*\([^)]*\brequest\b[^)]*\)'
    for match in re.finditer(request_pattern, content):
        results['methods_with_request'].append(match.group(1))
    
    # 查找 get_current_role 调用
    gcr_pattern = r'get_current_role\s*\(\s*(\w+)\s*,\s*(\w+)?\s*\)'
    for match in re.finditer(gcr_pattern, content):
        results['get_current_role_calls'].append(match.group(0))
    
    # 查找 get_accessible_students 调用
    gas_pattern = r'get_accessible_students\s*\([^)]+\)'
    for match in re.finditer(gas_pattern, content):
        results['get_accessible_students_calls'].append(match.group(0))
    
    return results


def print_analysis_report(all_results):
    """打印分析报告"""
    print("\n" + "=" * 60)
    print("📊 Service 层改造分析报告")
    print("=" * 60)
    
    total_methods = 0
    for result in all_results:
        print(f"\n📁 {result['file']}")
        print("-" * 40)
        
        if result['methods_with_user']:
            print(f"  🔸 带 user 参数的方法: {len(result['methods_with_user'])}")
            for m in result['methods_with_user']:
                print(f"      - {m}()")
            total_methods += len(result['methods_with_user'])
        
        if result['methods_with_request']:
            print(f"  🔸 带 request 参数的方法: {len(result['methods_with_request'])}")
            for m in result['methods_with_request']:
                if m not in result['methods_with_user']:
                    print(f"      - {m}()")
        
        if result['get_current_role_calls']:
            print(f"  🔸 get_current_role 调用: {len(result['get_current_role_calls'])}")
        
        if result['get_accessible_students_calls']:
            print(f"  🔸 get_accessible_students 调用: {len(result['get_accessible_students_calls'])}")
    
    print("\n" + "=" * 60)
    print(f"📈 总计需要改造的方法数: {total_methods}")
    print("=" * 60)


def refactor_file(filepath):
    """改造单个文件"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # 1. 替换 import
    content = re.sub(
        r'from apps\.users\.permissions import get_current_role,',
        'from apps.users.permissions import',
        content
    )
    content = re.sub(
        r'from apps\.users\.permissions import get_current_role\n',
        '',
        content
    )
    
    # 2. 替换 get_current_role(user, request) -> self.get_current_role()
    content = re.sub(
        r'get_current_role\s*\(\s*user\s*,\s*request\s*\)',
        'self.get_current_role()',
        content
    )
    content = re.sub(
        r'get_current_role\s*\(\s*self\.user\s*,\s*self\.request\s*\)',
        'self.get_current_role()',
        content
    )
    
    # 3. 替换 get_accessible_students(user, xxx, request) -> get_accessible_students(self.user, xxx, self.request)
    content = re.sub(
        r'get_accessible_students\s*\(\s*user\s*,\s*([^,]+),\s*request\s*\)',
        r'get_accessible_students(self.user, \1, self.request)',
        content
    )
    content = re.sub(
        r'get_accessible_students\s*\(\s*user\s*,\s*request\s*=\s*request\s*\)',
        'get_accessible_students(self.user, request=self.request)',
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ 已修改: {filepath}")
        return True
    else:
        print(f"⏭️  无需修改: {filepath}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Service 层构造器注入改造脚本')
    parser.add_argument('--analyze', action='store_true', help='分析模式')
    parser.add_argument('--refactor', action='store_true', help='执行改造')
    args = parser.parse_args()
    
    if not args.analyze and not args.refactor:
        args.analyze = True  # 默认分析模式
    
    if args.analyze:
        print("🔍 正在分析 Service 文件...")
        all_results = []
        for service_file in SERVICE_FILES:
            filepath = APPS_DIR / service_file
            if filepath.exists():
                result = analyze_file(filepath)
                all_results.append(result)
            else:
                print(f"⚠️  文件不存在: {filepath}")
        
        print_analysis_report(all_results)
        
        print("\n💡 提示: 使用 --refactor 参数执行自动改造")
        print("   python scripts/refactor_services.py --refactor")
    
    if args.refactor:
        print("🔧 正在执行改造...")
        modified_count = 0
        for service_file in SERVICE_FILES:
            filepath = APPS_DIR / service_file
            if filepath.exists():
                if refactor_file(filepath):
                    modified_count += 1
        
        print(f"\n✅ 改造完成! 修改了 {modified_count} 个文件")
        print("\n⚠️  注意: 脚本只做了简单替换，请手动检查以下内容:")
        print("   1. 方法签名中的 user/request 参数需要手动移除")
        print("   2. View 层需要改为继承 BaseAPIView")
        print("   3. 运行 python manage.py check 验证改动")


if __name__ == '__main__':
    main()
