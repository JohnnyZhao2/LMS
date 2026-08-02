from django.apps import AppConfig


class ActivityLogsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.activity_logs'
    verbose_name = '活动日志'

    def ready(self):
        from .audit import register_activity_log_audit_publisher
        from .registry import load_declared_log_actions

        load_declared_log_actions()
        register_activity_log_audit_publisher()
