"""Validate authorization definitions stay in sync across the repo."""

from django.core.management.base import BaseCommand, CommandError

from apps.authorization.consistency import validate_authorization_consistency


class Command(BaseCommand):
    help = '检查权限目录、前端展示和权限引用是否一致'

    def handle(self, *args, **options):
        errors = validate_authorization_consistency()
        if errors:
            error_message = '\n'.join(f'- {item}' for item in errors)
            raise CommandError(f'权限一致性检查失败:\n{error_message}')

        self.stdout.write(self.style.SUCCESS('✅ 权限一致性检查通过'))
