"""
Management command to initialize predefined roles.
"""
from django.core.management.base import BaseCommand
from apps.users.models import Role


class Command(BaseCommand):
    help = '初始化系统预定义角色'

    def handle(self, *args, **options):
        roles_data = [
            {'name': '学员', 'code': Role.STUDENT, 'description': '系统学员，可以查看和完成学习任务'},
            {'name': '导师', 'code': Role.MENTOR, 'description': '导师，可以管理自己的学员'},
            {'name': '室经理', 'code': Role.DEPT_MANAGER, 'description': '部门经理，可以管理本部门员工'},
            {'name': '团队经理', 'code': Role.TEAM_MANAGER, 'description': '团队经理，可以查看所有部门数据'},
            {'name': '管理员', 'code': Role.ADMIN, 'description': '系统管理员，拥有所有权限'},
        ]

        created_count = 0
        for role_data in roles_data:
            role, created = Role.objects.get_or_create(
                code=role_data['code'],
                defaults={
                    'name': role_data['name'],
                    'description': role_data['description']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'✓ 创建角色: {role.name} ({role.code})'))
            else:
                self.stdout.write(f'  角色已存在: {role.name} ({role.code})')

        if created_count > 0:
            self.stdout.write(self.style.SUCCESS(f'\n✅ 成功创建 {created_count} 个角色'))
        else:
            self.stdout.write(self.style.WARNING('\n所有角色已存在'))
