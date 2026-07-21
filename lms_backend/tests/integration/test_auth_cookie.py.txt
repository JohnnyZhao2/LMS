import pytest
from django.conf import settings
from rest_framework.test import APIClient

from apps.users.models import Department, User


@pytest.mark.django_db
def test_refresh_token_never_leaves_http_only_cookie():
    department = Department.objects.create(name='测试室', code='TEST')
    User.objects.create_superuser(
        employee_id='admin-cookie-test',
        username='Cookie 管理员',
        password='secure-password',
        department=department,
    )
    client = APIClient()

    login_response = client.post('/api/auth/login/', {
        'employee_id': 'admin-cookie-test',
        'password': 'secure-password',
    }, format='json')

    assert login_response.status_code == 200
    assert isinstance(login_response.json()['message'], str)
    assert 'refresh_token' not in login_response.data['data']
    assert login_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]['httponly'] is True
    original_refresh_cookie = login_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value

    refresh_response = client.post('/api/auth/refresh/', {}, format='json')

    assert refresh_response.status_code == 200
    assert set(refresh_response.data['data']) == {'access_token'}
    rotated_refresh_cookie = refresh_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME].value
    assert rotated_refresh_cookie != original_refresh_cookie

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh_response.data['data']['access_token']}")
    logout_response = client.post('/api/auth/logout/', {}, format='json')

    assert logout_response.status_code == 200
    assert logout_response.cookies[settings.AUTH_REFRESH_COOKIE_NAME]['max-age'] == 0
