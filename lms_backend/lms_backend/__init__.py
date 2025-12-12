# LMS Backend Application

# Use PyMySQL as MySQL driver
import pymysql
pymysql.install_as_MySQLdb()

# Import Celery app only if celery is installed
try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    # Celery is optional
    pass
