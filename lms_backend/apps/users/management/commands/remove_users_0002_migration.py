"""
删除 users.0002_convert_naive_datetimes_to_utc 的迁移记录
Usage:
    python manage.py remove_users_0002_migration --settings=config.settings.development
    python manage.py remove_users_0002_migration --dry-run --settings=config.settings.development
"""
from django.core.management.base import BaseCommand
from django.db import connections
from django.db.migrations.recorder import MigrationRecorder


class Command(BaseCommand):
    help = '删除 users.0002_convert_naive_datetimes_to_utc 的迁移记录（仅迁移表）'
    def add_arguments(self, parser):
        parser.add_argument(
            '--database',
            type=str,
            default='default',
            help='数据库别名（默认: default）'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='仅查看将被删除的记录数量'
        )
    def handle(self, *args, **options):
        database = options['database']
        dry_run = options['dry_run']
        connection = connections[database]
        recorder = MigrationRecorder(connection)
        if not recorder.has_table():
            self.stdout.write(self.style.WARNING('django_migrations 表不存在，无需处理'))
            return
        qs = recorder.Migration.objects.filter(
            app='users',
            name='0002_convert_naive_datetimes_to_utc'
        )
        count = qs.count()
        if count == 0:
            self.stdout.write(self.style.WARNING('未找到 users.0002_convert_naive_datetimes_to_utc 迁移记录'))
            return
        if dry_run:
            self.stdout.write(self.style.WARNING(f'将删除 {count} 条迁移记录（dry-run）'))
            return
        qs.delete()
        self.stdout.write(self.style.SUCCESS(f'已删除 {count} 条迁移记录'))
