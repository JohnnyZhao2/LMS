"""Sync permission catalog and role baseline."""

from django.core.management.base import BaseCommand
from django.core.management.base import CommandError

from apps.authorization.services import AuthorizationService


class Command(BaseCommand):
    help = '同步权限目录；可选将角色权限覆盖重置回代码默认值'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sync-role-templates',
            action='store_true',
            help='保留兼容入口；仅在配合重置参数时清空角色权限覆盖',
        )
        parser.add_argument(
            '--overwrite-existing-role-templates',
            action='store_true',
            help='强制清空已有角色权限覆盖，回退到代码默认值',
        )

    def handle(self, *args, **options):
        sync_role_templates = options['sync_role_templates']
        overwrite_existing_role_templates = options['overwrite_existing_role_templates']
        if overwrite_existing_role_templates and not sync_role_templates:
            raise CommandError('--overwrite-existing-role-templates 必须与 --sync-role-templates 一起使用')

        AuthorizationService.ensure_defaults(
            sync_role_templates=sync_role_templates,
            overwrite_existing_role_templates=overwrite_existing_role_templates,
        )

        if overwrite_existing_role_templates:
            self.stdout.write(self.style.SUCCESS('✅ 权限目录同步完成，角色权限覆盖已重置为代码默认值'))
            return
        if sync_role_templates:
            self.stdout.write(self.style.SUCCESS('✅ 权限目录同步完成（当前版本角色模板按代码默认值动态解析）'))
            return
        self.stdout.write(self.style.SUCCESS('✅ 权限目录同步完成'))
