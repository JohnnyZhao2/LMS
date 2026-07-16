"""Isolated MySQL settings shared by pytest and browser acceptance tests."""

import os

from dotenv import dotenv_values

from .base import *  # noqa: F401,F403


DEBUG = False
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', 'testserver']
CORS_ALLOW_ALL_ORIGINS = True

development_env = dotenv_values(BASE_DIR / '.env.development')


def connection_value(name: str, default: str = '') -> str:
    return os.getenv(name) or str(development_env.get(name) or default)

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.getenv('E2E_DB_NAME', 'lms_e2e'),
        'USER': connection_value('DB_USER', 'root'),
        'PASSWORD': connection_value('DB_PASSWORD'),
        'HOST': connection_value('DB_HOST', 'localhost'),
        'PORT': connection_value('DB_PORT', '3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES', time_zone='+08:00'",
        },
        'TEST': {
            'NAME': os.getenv('PYTEST_DB_NAME', 'test_lms_e2e'),
        },
    },
}

PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '10000/hour',
    'user': '10000/hour',
    'auth': '10000/minute',
    'submission': '10000/hour',
    'burst': '10000/minute',
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
}
