"""
初始化系统基础数据的管理命令

Usage:
    python manage.py init_data --settings=config.settings.development
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.users.models import Department, Role, User, UserRole


class Command(BaseCommand):
    help = '初始化系统基础数据（部门、角色、管理员账号）'

    def handle(self, *args, **options):
        with transaction.atomic():
            self.create_departments()
            self.create_roles()
            self.create_admin_user()
        
        self.stdout.write(self.style.SUCCESS('✅ 初始化数据完成！'))

    def create_departments(self):
        """创建部门"""
        departments = [
            {'code': 'DEPT1', 'name': '一室', 'description': '第一研发室'},
            {'code': 'DEPT2', 'name': '二室', 'description': '第二研发室'},
        ]
        
        for dept_data in departments:
            dept, created = Department.objects.get_or_create(
                code=dept_data['code'],
                defaults=dept_data
            )
            status = '创建' if created else '已存在'
            self.stdout.write(f"  部门 {dept.name}: {status}")

    def create_roles(self):
        """创建角色"""
        roles = [
            {'code': 'STUDENT', 'name': '学员', 'description': '系统默认角色，所有用户都有'},
            {'code': 'MENTOR', 'name': '导师', 'description': '可以指导学员'},
            {'code': 'DEPT_MANAGER', 'name': '室经理', 'description': '管理本室成员'},
            {'code': 'TEAM_MANAGER', 'name': '团队经理', 'description': '管理整个团队'},
            {'code': 'ADMIN', 'name': '管理员', 'description': '系统管理员，拥有所有权限'},
        ]
        
        for role_data in roles:
            role, created = Role.objects.get_or_create(
                code=role_data['code'],
                defaults=role_data
            )
            status = '创建' if created else '已存在'
            self.stdout.write(f"  角色 {role.name}: {status}")

    def create_admin_user(self):
        """创建管理员账号"""
        dept = Department.objects.filter(code='DEPT1').first()
        
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'employee_id': 'ADMIN001',
                'real_name': '系统管理员',
                'department': dept,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(f"  管理员账号: 创建 (用户名: admin, 密码: admin123)")
        else:
            self.stdout.write(f"  管理员账号: 已存在")
        
        # 确保管理员有 ADMIN 角色
        admin_role = Role.objects.get(code='ADMIN')
        UserRole.objects.get_or_create(user=admin, role=admin_role)
