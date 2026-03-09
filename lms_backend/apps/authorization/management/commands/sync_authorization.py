"""Sync permission catalog and role baseline."""

from django.core.management.base import BaseCommand

from apps.authorization.services import AuthorizationService


class Command(BaseCommand):
    help = '同步权限目录与角色基线权限模板'

    def handle(self, *args, **options):
        AuthorizationService.ensure_defaults()
        self.stdout.write(self.style.SUCCESS('✅ 权限目录与角色基线权限同步完成'))
