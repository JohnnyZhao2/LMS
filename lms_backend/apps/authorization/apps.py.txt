from django.apps import AppConfig
from django.db.models.signals import post_migrate


class AuthorizationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.authorization'
    verbose_name = '授权管理'

    def ready(self):
        from .bootstrap import sync_authorization_defaults

        post_migrate.connect(
            sync_authorization_defaults,
            sender=self,
            dispatch_uid='apps.authorization.sync_authorization_defaults',
        )
