"""Sync permission catalog."""

from django.core.management.base import BaseCommand

from apps.authorization.services import AuthorizationService


class Command(BaseCommand):
    help = '同步权限目录（含固定权限归属）'

    def handle(self, *args, **options):
        AuthorizationService.ensure_defaults()
        self.stdout.write(self.style.SUCCESS('✅ 权限目录同步完成'))
