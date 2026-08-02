"""Django development settings."""
import os

from .base import *

DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', *[
    host for host in os.getenv('ALLOWED_HOSTS', '').split(',') if host
]]

CORS_ALLOW_ALL_ORIGINS = True

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': LOGGING_VERBOSE_FORMATTER,
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
