from django.db import connections
from django.http import JsonResponse


def healthz(_request):
    return JsonResponse({'status': 'ok', 'service': 'lms-backend'})


def readyz(_request):
    with connections['default'].cursor() as cursor:
        cursor.execute('SELECT 1')
        cursor.fetchone()

    return JsonResponse({'status': 'ok', 'service': 'lms-backend', 'database': 'ok'})
