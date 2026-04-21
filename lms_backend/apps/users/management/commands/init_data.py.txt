"""
初始化系统基础数据的管理命令
Usage:
    python manage.py init_data --settings=config.settings.development
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authorization.services import AuthorizationService
from apps.users.models import Department, Role


class Command(BaseCommand):
    help = '初始化系统基础数据（部门、角色、权限）'

    def handle(self, *args, **options):
        with transaction.atomic():
            self.create_departments()
            self.create_roles()
            AuthorizationService.ensure_defaults(sync_role_templates=True)
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
            {'code': 'STUDENT', 'name': '学员', 'description': '系统默认学习角色（与管理角色互斥）'},
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
