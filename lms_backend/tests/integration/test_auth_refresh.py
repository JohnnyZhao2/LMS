import pytest
from rest_framework.test import APIClient

from apps.users.models import User, Department


@pytest.mark.django_db
def test_refresh_token_contract_fields():
    client = APIClient()

    department = Department.objects.create(name='Dept 1', code='DEPT1')
    User.objects.create_user(
        employee_id='EMP001',
        username='Test User',
        password='password123',
        department=department,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP001', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200
    refresh_token = login_response.data['refresh_token']

    refresh_response = client.post(
        '/api/auth/refresh/',
        {'refresh_token': refresh_token},
        format='json',
    )
    assert refresh_response.status_code == 200
    assert 'access_token' in refresh_response.data
    assert 'refresh_token' in refresh_response.data
