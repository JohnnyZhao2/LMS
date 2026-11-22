"""Django test settings using local MySQL and real migrations."""

from .base import *  # noqa: F401,F403

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_CLASSES': [],
}
ONE_ACCOUNT_OIDC = {
    **ONE_ACCOUNT_OIDC,
    'ENABLED': False,
}
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
}
