"""Sync permission catalog."""

from django.core.management.base import BaseCommand

from apps.authorization.services import AuthorizationService


class Command(BaseCommand):
    help = '同步权限目录（新增/删除权限声明后显式执行）'

    def handle(self, *args, **options):
        AuthorizationService.sync_permission_catalog()
        self.stdout.write(self.style.SUCCESS('✅ 权限目录同步完成'))
