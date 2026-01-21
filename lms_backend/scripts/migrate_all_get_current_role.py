#!/usr/bin/env python3
"""
自动修改所有 get_current_role 调用，添加 request 参数

使用方法:
    python scripts/migrate_all_get_current_role.py --dry-run  # 预览修改
    python scripts/migrate_all_get_current_role.py            # 执行修改
"""
import re
import sys
from pathlib import Path

def fix_get_current_role_calls(file_path, dry_run=True):
    """修改文件中的 get_current_role 调用"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Pattern 1: get_current_role(request.user) -> get_current_role(request.user, request)
    pattern1 = r'get_current_role\(request\.user\)(?!,)'
    replacement1 = 'get_current_role(request.user, request)'
    content, n1 = re.subn(pattern1, replacement1, content)
    
    # Pattern 2: get_current_role(user) where user is request.user or self.request.user
    # 这个比较复杂，需要手动处理
    
    changes_made = (content != original_content)
    num_changes = n1
    
    if changes_made:
        if not dry_run:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        return num_changes
    return 0

def main():
    dry_run = '--dry-run' in sys.argv
    
    # 自动查找所有需要处理的 Python 文件
    base_path = Path('/Users/johnnyzhao/Documents/LMS/lms_backend')
    
    # 需要处理的目录
    dirs_to_process = [
        'apps/users/views',
        'apps/knowledge/views',
        'apps/tasks/views',
        'apps/quizzes/views.py',
        'apps/questions/views.py',
        'apps/spot_checks/views.py',
        'apps/dashboard/views',
    ]
    
    total_files = 0
    total_changes = 0
    
    print("=" * 70)
    print("RBAC Header 迁移 - get_current_role 调用自动修改工具")
    print("=" * 70)
    print(f"模式: {'预览模式（不会实际修改文件）' if dry_run else '执行模式（将修改文件）'}")
    print()
    
    for dir_or_file in dirs_to_process:
        path = base_path / dir_or_file
        
        if path.is_file():
            files = [path]
        elif path.is_dir():
            files = list(path.rglob('*.py'))
        else:
            print(f"⚠️  路径不存在: {dir_or_file}")
            continue
        
        for file_path in files:
            rel_path = file_path.relative_to(base_path)
            num_changes = fix_get_current_role_calls(file_path, dry_run)
            
            if num_changes > 0:
                total_files += 1
                total_changes += num_changes
                print(f"✅ {rel_path}: {num_changes} 处修改")
    
    print()
    print("=" * 70)
    print(f"总计: {total_files} 个文件, {total_changes} 处修改")
    if dry_run:
        print()
        print("💡 提示：运行不带 --dry-run 参数以执行实际修改")
    else:
        print()
        print("✅ 修改已完成！")
    print("=" * 70)

if __name__ == '__main__':
    main()
