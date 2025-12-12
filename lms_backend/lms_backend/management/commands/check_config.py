"""
Management command to verify LMS Backend configuration.
"""
from django.core.management.base import BaseCommand
from django.conf import settings
import sys


class Command(BaseCommand):
    help = 'Verify LMS Backend configuration'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== LMS Backend Configuration Check ===\n'))
        
        # Check Django settings
        self.stdout.write(self.style.HTTP_INFO('Django Settings:'))
        self.stdout.write(f'  DEBUG: {settings.DEBUG}')
        self.stdout.write(f'  SECRET_KEY: {"Set" if settings.SECRET_KEY else "Not Set"}')
        self.stdout.write(f'  ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}')
        self.stdout.write(f'  TIME_ZONE: {settings.TIME_ZONE}')
        self.stdout.write(f'  LANGUAGE_CODE: {settings.LANGUAGE_CODE}\n')
        
        # Check database configuration
        self.stdout.write(self.style.HTTP_INFO('Database Configuration:'))
        db_config = settings.DATABASES['default']
        self.stdout.write(f'  Engine: {db_config["ENGINE"]}')
        self.stdout.write(f'  Name: {db_config["NAME"]}')
        self.stdout.write(f'  Host: {db_config["HOST"]}')
        self.stdout.write(f'  Port: {db_config["PORT"]}\n')
        
        # Check REST Framework configuration
        self.stdout.write(self.style.HTTP_INFO('REST Framework:'))
        self.stdout.write(f'  Authentication: {settings.REST_FRAMEWORK["DEFAULT_AUTHENTICATION_CLASSES"]}')
        self.stdout.write(f'  Pagination: {settings.REST_FRAMEWORK["DEFAULT_PAGINATION_CLASS"]}')
        self.stdout.write(f'  Page Size: {settings.REST_FRAMEWORK["PAGE_SIZE"]}\n')
        
        # Check JWT configuration
        self.stdout.write(self.style.HTTP_INFO('JWT Configuration:'))
        self.stdout.write(f'  Access Token Lifetime: {settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]}')
        self.stdout.write(f'  Refresh Token Lifetime: {settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]}\n')
        
        # Check Celery configuration
        self.stdout.write(self.style.HTTP_INFO('Celery Configuration:'))
        if settings.CELERY_BROKER_URL:
            self.stdout.write(f'  Broker URL: {settings.CELERY_BROKER_URL}')
            self.stdout.write(f'  Result Backend: {settings.CELERY_RESULT_BACKEND}')
        else:
            self.stdout.write('  Not configured (async tasks disabled)')
        self.stdout.write('')
        
        # Check Cache configuration
        self.stdout.write(self.style.HTTP_INFO('Cache Configuration:'))
        cache_backend = settings.CACHES['default']['BACKEND']
        self.stdout.write(f'  Backend: {cache_backend}')
        
        # Check CORS configuration
        self.stdout.write(self.style.HTTP_INFO('CORS Configuration:'))
        self.stdout.write(f'  Allowed Origins: {settings.CORS_ALLOWED_ORIGINS}')
        self.stdout.write(f'  Allow Credentials: {settings.CORS_ALLOW_CREDENTIALS}\n')
        
        # Check installed apps
        self.stdout.write(self.style.HTTP_INFO('Installed Apps:'))
        for app in settings.INSTALLED_APPS:
            if app.startswith('apps.') or app in ['rest_framework', 'corsheaders', 'drf_spectacular']:
                self.stdout.write(f'  ✓ {app}')
        
        self.stdout.write(self.style.SUCCESS('\n✓ Configuration check completed successfully!'))
