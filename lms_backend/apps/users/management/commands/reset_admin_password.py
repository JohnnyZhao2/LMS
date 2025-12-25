"""
重置管理员密码的管理命令

Usage:
    python manage.py reset_admin_password --employee-id ADMIN001 --password newpassword
    python manage.py reset_admin_password --employee-id ADMIN001  # 使用默认密码 admin123
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.users.models import User


class Command(BaseCommand):
    help = '重置管理员密码'

    def add_arguments(self, parser):
        parser.add_argument(
            '--employee-id',
            type=str,
            required=True,
            help='管理员工号（如 ADMIN001）'
        )
        parser.add_argument(
            '--password',
            type=str,
            default='admin123',
            help='新密码（默认: admin123）'
        )

    def handle(self, *args, **options):
        employee_id = options['employee_id']
        new_password = options['password']

        try:
            with transaction.atomic():
                user = User.objects.get(employee_id=employee_id)
                
                # 检查是否是管理员
                if not user.is_admin:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠️  警告: 用户 {employee_id} 不是管理员，但将继续重置密码'
                        )
                    )
                
                # 重置密码
                user.set_password(new_password)
                user.save()
                
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ 密码重置成功！\n'
                        f'   工号: {employee_id}\n'
                        f'   姓名: {user.username}\n'
                        f'   新密码: {new_password}\n'
                        f'   请妥善保管新密码！'
                    )
                )
        except User.DoesNotExist:
            raise CommandError(f'❌ 用户不存在: {employee_id}')
        except Exception as e:
            raise CommandError(f'❌ 重置密码失败: {str(e)}')


