from django.apps import AppConfig
from django.db.models.signals import post_migrate


class ActivityLogsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.activity_logs'
    verbose_name = '活动日志'

    def ready(self):
        from .audit import register_activity_log_audit_publisher
        from .bootstrap import sync_activity_log_policies

        register_activity_log_audit_publisher()
        post_migrate.connect(
            sync_activity_log_policies,
            sender=self,
            dispatch_uid='apps.activity_logs.sync_activity_log_policies',
        )
