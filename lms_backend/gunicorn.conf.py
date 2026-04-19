import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

bind = os.getenv('GUNICORN_BIND', '127.0.0.1:8000')
workers = int(os.getenv('GUNICORN_WORKERS', '4'))
threads = int(os.getenv('GUNICORN_THREADS', '2'))
timeout = int(os.getenv('GUNICORN_TIMEOUT', '120'))
graceful_timeout = int(os.getenv('GUNICORN_GRACEFUL_TIMEOUT', '30'))
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', '5'))
chdir = str(BASE_DIR)
accesslog = '-'
errorlog = '-'
capture_output = True
