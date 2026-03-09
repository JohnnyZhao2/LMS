import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.authorization.models import Permission, UserPermissionOverride
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture(autouse=True)
def clear_auth_throttle_cache():
    cache.clear()
    yield
    cache.clear()


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


@pytest.mark.django_db
def test_header_role_cannot_override_token_current_role():
    client = APIClient()

    department = Department.objects.create(name='Dept 3', code='DEPT3')
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})

    user = User.objects.create_user(
        employee_id='EMP003',
        username='Role Mixed User',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=admin_role)
    UserRole.objects.get_or_create(user=user, role=mentor_role)

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP003', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200
    access_token = login_response.data['data']['access_token']

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    response = client.get('/api/users/mentees/', HTTP_X_CURRENT_ROLE='MENTOR')

    assert response.status_code != 200
    assert response.data['code'] == 'PERMISSION_DENIED'


@pytest.mark.django_db
def test_login_response_contains_effective_permissions():
    client = APIClient()

    department = Department.objects.create(name='Dept 4', code='DEPT4')
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})

    user = User.objects.create_user(
        employee_id='EMP004',
        username='Permission User',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=admin_role)

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP004', 'password': 'password123'},
        format='json',
    )

    assert login_response.status_code == 200
    assert login_response.data['code'] == 'SUCCESS'
    effective_permissions = login_response.data['data'].get('effective_permissions')
    assert isinstance(effective_permissions, list)
    assert 'user.view' in effective_permissions


@pytest.mark.django_db
def test_user_view_permission_can_be_denied_by_override():
    client = APIClient()

    department = Department.objects.create(name='Dept 5', code='DEPT5')
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})

    admin_user = User.objects.create_user(
        employee_id='EMP005',
        username='Denied Admin',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=admin_user, role=admin_role)

    permission = Permission.objects.get(code='user.view')
    UserPermissionOverride.objects.create(
        user=admin_user,
        permission=permission,
        effect='DENY',
        applies_to_role='ADMIN',
        scope_type='ALL',
        reason='测试显式拒绝优先级',
        granted_by=admin_user,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP005', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200
    access_token = login_response.data['data']['access_token']

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    response = client.get('/api/users/')
    assert response.status_code == 400
    assert response.data['code'] == 'PERMISSION_DENIED'
