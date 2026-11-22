"""
初始化系统基础数据的管理命令
Usage:
    python manage.py init_data --settings=config.settings.development
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.authorization.roles import ensure_builtin_role_profiles
from apps.users.models import Department


class Command(BaseCommand):
    help = '初始化系统基础数据（部门、角色）'

    def handle(self, *args, **options):
        with transaction.atomic():
            self.create_departments()
            self.create_roles()
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
        """创建内置角色 Group 及 RoleProfile。"""
        profiles = ensure_builtin_role_profiles()
        for profile in profiles:
            self.stdout.write(f"  角色 {profile.name} ({profile.group.name}, {profile.data_scope}): 就绪")
