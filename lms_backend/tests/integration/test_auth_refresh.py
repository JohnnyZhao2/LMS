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
    assert login_response.data['code'] == 'SUCCESS'
    assert 'data' in login_response.data
    refresh_token = login_response.data['data']['refresh_token']

    refresh_response = client.post(
        '/api/auth/refresh/',
        {'refresh_token': refresh_token},
        format='json',
    )
    assert refresh_response.status_code == 200
    assert refresh_response.data['code'] == 'SUCCESS'
    assert 'access_token' in refresh_response.data['data']
    assert 'refresh_token' in refresh_response.data['data']


@pytest.mark.django_db
def test_refresh_token_should_rotate_and_invalidate_old_token():
    client = APIClient()

    department = Department.objects.create(name='Dept 2', code='DEPT2')
    User.objects.create_user(
        employee_id='EMP002',
        username='Test User 2',
        password='password123',
        department=department,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP002', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200
    old_refresh_token = login_response.data['data']['refresh_token']

    first_refresh_response = client.post(
        '/api/auth/refresh/',
        {'refresh_token': old_refresh_token},
        format='json',
    )
    assert first_refresh_response.status_code == 200
    new_refresh_token = first_refresh_response.data['data']['refresh_token']
    assert new_refresh_token != old_refresh_token

    second_refresh_response = client.post(
        '/api/auth/refresh/',
        {'refresh_token': old_refresh_token},
        format='json',
    )
    assert second_refresh_response.status_code == 400
    assert second_refresh_response.data['code'] == 'AUTH_INVALID_CREDENTIALS'
