#!/usr/bin/env python3
"""
自动修改 View 层文件，为所有 Service 调用添加 request 参数

使用方法:
    python scripts/migrate_view_calls.py --dry-run  # 预览修改
    python scripts/migrate_view_calls.py            # 执行修改
"""
import re
import sys
from pathlib import Path

# Service 方法列表（需要添加 request 参数的）
SERVICE_METHODS = [
    'get_by_id',
    'get_list',
    'create',
    'update',
    'delete',
    'check_edit_permission',
    'get_dashboard_data',
]

def find_and_replace_service_calls(file_path, dry_run=True):
    """查找并替换文件中的 service 调用"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    changes = []
    
    for method in SERVICE_METHODS:
        # 匹配模式：self.service.method(args, request.user)
        # 替换为：self.service.method(args, request.user, request=request)
        
        # Pattern 1: self.service.method(..., request.user)
        pattern1 = rf'(self\.service\.{method}\([^)]*,\s*request\.user)(\))'
        replacement1 = r'\1, request=request\2'
        content, n1 = re.subn(pattern1, replacement1, content)
        if n1 > 0:
            changes.append(f"  - {method}: {n1} 处修改（模式1）")
        
        # Pattern 2: self.service.method(..., user=request.user)
        pattern2 = rf'(self\.service\.{method}\([^)]*,\s*user=request\.user)(\))'
        replacement2 = r'\1, request=request\2'
        content, n2 = re.subn(pattern2, replacement2, content)
        if n2 > 0:
            changes.append(f"  - {method}: {n2} 处修改（模式2）")
    
    if content != original_content:
        if not dry_run:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        return changes
    return None

def main():
    dry_run = '--dry-run' in sys.argv
    
    # 需要处理的 View 文件
    view_files = [
        'apps/questions/views.py',
        'apps/quizzes/views.py',
        'apps/knowledge/views/knowledge.py',
        'apps/spot_checks/views.py',
        'apps/dashboard/views/mentor.py',
    ]
    
    base_path = Path('/Users/johnnyzhao/Documents/LMS/lms_backend')
    total_files = 0
    total_changes = 0
    
    print("=" * 60)
    print("RBAC Header 迁移 - View 层自动修改工具")
    print("=" * 60)
    print(f"模式: {'预览模式（不会实际修改文件）' if dry_run else '执行模式（将修改文件）'}")
    print()
    
    for rel_path in view_files:
        file_path = base_path / rel_path
        if not file_path.exists():
            print(f"⚠️  跳过（文件不存在）: {rel_path}")
            continue
        
        changes = find_and_replace_service_calls(file_path, dry_run)
        if changes:
            total_files += 1
            total_changes += len(changes)
            print(f"✅ {rel_path}")
            for change in changes:
                print(change)
            print()
        else:
            print(f"⏭️  无需修改: {rel_path}")
    
    print("=" * 60)
    print(f"总计: {total_files} 个文件, {total_changes} 处修改")
    if dry_run:
        print()
        print("💡 提示：运行不带 --dry-run 参数以执行实际修改")
    else:
        print()
        print("✅ 修改已完成！请运行测试验证功能")
    print("=" * 60)

if __name__ == '__main__':
    main()
