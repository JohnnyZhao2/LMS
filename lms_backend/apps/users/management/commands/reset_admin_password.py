"""
重置管理员密码的管理命令
Usage:
    python manage.py reset_admin_password --employee-id ADMIN001 --password newpassword
"""
from django.core.management.base import BaseCommand, CommandError

from apps.users.models import User


class Command(BaseCommand):
    help = '重置管理员密码'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee-id',
            type=str,
            required=True,
            help='管理员工号（如 ADMIN001）',
        )
        parser.add_argument(
            '--password',
            type=str,
            required=True,
            help='新密码',
        )

    def handle(self, *args, **options):
        employee_id = options['employee_id']
        new_password = options['password']
        try:
            user = User.objects.get(employee_id=employee_id)
        except User.DoesNotExist as exc:
            raise CommandError(f'用户不存在: {employee_id}') from exc

        if not user.is_admin:
            raise CommandError(f'用户 {employee_id} 不是管理员')

        user.set_password(new_password)
        user.save(update_fields=['password'])
        self.stdout.write(self.style.SUCCESS(f'密码重置成功: {employee_id}'))
