import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.authorization.models import Permission, RolePermission, UserPermissionOverride
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture(autouse=True)
def clear_auth_throttle_cache():
    cache.clear()
    yield
    cache.clear()


@pytest.mark.django_db
def test_multi_role_login_defaults_to_student():
    client = APIClient()

    department = Department.objects.create(name='Dept Default Role', code='DEPT_DEFAULT_ROLE')
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})

    user = User.objects.create_user(
        employee_id='EMP_DEFAULT_ROLE',
        username='Default Role User',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=mentor_role)

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP_DEFAULT_ROLE', 'password': 'password123'},
        format='json',
    )

    assert login_response.status_code == 200
    payload = login_response.data['data']
    assert payload['current_role'] == 'STUDENT'
    assert {item['code'] for item in payload['available_roles']} == {'STUDENT', 'MENTOR'}
    assert payload['capabilities']['dashboard.student.view']['allowed'] is True
    assert payload['capabilities']['dashboard.mentor.view']['allowed'] is False


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
    assert second_refresh_response.status_code == 401
    assert second_refresh_response.data['code'] == 'AUTH_INVALID_CREDENTIALS'


@pytest.mark.django_db
def test_logout_blacklists_refresh_token():
    client = APIClient()

    department = Department.objects.create(name='Dept Logout', code='DEPT_LOGOUT')
    User.objects.create_user(
        employee_id='EMP_LOGOUT',
        username='Logout User',
        password='password123',
        department=department,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP_LOGOUT', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200
    payload = login_response.data['data']

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {payload['access_token']}")
    logout_response = client.post(
        '/api/auth/logout/',
        {'refresh_token': payload['refresh_token']},
        format='json',
    )
    assert logout_response.status_code == 200

    client.credentials()
    refresh_response = client.post(
        '/api/auth/refresh/',
        {'refresh_token': payload['refresh_token']},
        format='json',
    )
    assert refresh_response.status_code == 401
    assert refresh_response.data['code'] == 'AUTH_INVALID_CREDENTIALS'


@pytest.mark.django_db
def test_logout_rejects_invalid_refresh_token():
    client = APIClient()

    department = Department.objects.create(name='Dept Bad Logout', code='DEPT_BAD_LOGOUT')
    User.objects.create_user(
        employee_id='EMP_BAD_LOGOUT',
        username='Bad Logout User',
        password='password123',
        department=department,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP_BAD_LOGOUT', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200
    access_token = login_response.data['data']['access_token']

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    logout_response = client.post(
        '/api/auth/logout/',
        {'refresh_token': 'invalid-refresh-token'},
        format='json',
    )

    assert logout_response.status_code == 401
    assert logout_response.data['code'] == 'AUTH_INVALID_CREDENTIALS'


@pytest.mark.django_db
def test_change_password_updates_password_and_invalidates_tokens():
    client = APIClient()

    department = Department.objects.create(name='Dept Change Password', code='DEPT_CHANGE_PASSWORD')
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    permission = Permission.objects.get(code='user.activate')
    RolePermission.objects.get_or_create(role=admin_role, permission=permission)
    admin_user = User.objects.create_user(
        employee_id='EMP_CHANGE_PASSWORD_ADMIN',
        username='Change Password Admin',
        password='admin-password',
        department=department,
    )
    UserRole.objects.get_or_create(user=admin_user, role=admin_role)
    target_user = User.objects.create_user(
        employee_id='EMP_CHANGE_PASSWORD_TARGET',
        username='Change Password Target',
        password='old-password',
        department=department,
    )

    target_login_response = client.post(
        '/api/auth/login/',
        {'employee_id': target_user.employee_id, 'password': 'old-password'},
        format='json',
    )
    assert target_login_response.status_code == 200
    old_refresh_token = target_login_response.data['data']['refresh_token']

    admin_login_response = client.post(
        '/api/auth/login/',
        {'employee_id': admin_user.employee_id, 'password': 'admin-password'},
        format='json',
    )
    assert admin_login_response.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_login_response.data['data']['access_token']}")
    switch_response = client.post('/api/auth/switch-role/', {'role_code': 'ADMIN'}, format='json')
    assert switch_response.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {switch_response.data['data']['access_token']}")

    change_response = client.post(
        '/api/auth/change-password/',
        {'user_id': target_user.id, 'password': 'new-password'},
        format='json',
    )
    assert change_response.status_code == 200

    client.credentials()
    old_login_response = client.post(
        '/api/auth/login/',
        {'employee_id': target_user.employee_id, 'password': 'old-password'},
        format='json',
    )
    assert old_login_response.status_code == 401

    new_login_response = client.post(
        '/api/auth/login/',
        {'employee_id': target_user.employee_id, 'password': 'new-password'},
        format='json',
    )
    assert new_login_response.status_code == 200

    refresh_response = client.post('/api/auth/refresh/', {'refresh_token': old_refresh_token}, format='json')
    assert refresh_response.status_code == 401
    assert refresh_response.data['code'] == 'AUTH_INVALID_CREDENTIALS'


@pytest.mark.django_db
def test_token_current_role_is_request_source_of_truth():
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
    response = client.get('/api/knowledge/')

    assert response.status_code == 200
    assert response.data['code'] == 'SUCCESS'


@pytest.mark.django_db
def test_knowledge_view_permission_can_be_denied_by_override():
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

    permission = Permission.objects.get(code='knowledge.view')
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
    switch_response = client.post(
        '/api/auth/switch-role/',
        {'role_code': 'ADMIN'},
        format='json',
    )
    assert switch_response.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {switch_response.data['data']['access_token']}")
    response = client.get('/api/knowledge/')
    assert response.status_code == 403
    assert response.data['code'] == 'PERMISSION_DENIED'


@pytest.mark.django_db
def test_superuser_login_returns_dedicated_super_admin_role():
    client = APIClient()

    department = Department.objects.create(name='Dept 6', code='DEPT6')
    User.objects.create_user(
        employee_id='EMP006',
        username='Super Admin User',
        password='password123',
        department=department,
        is_staff=True,
        is_superuser=True,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP006', 'password': 'password123'},
        format='json',
    )

    assert login_response.status_code == 200
    payload = login_response.data['data']
    assert payload['current_role'] == 'SUPER_ADMIN'
    assert payload['available_roles'] == [{'code': 'SUPER_ADMIN', 'name': '超管'}]
    assert payload['capabilities']['user.view']['allowed'] is True
    assert payload['capabilities']['knowledge.view']['allowed'] is True
    assert payload['capabilities']['activity_log.view']['allowed'] is True


@pytest.mark.django_db
def test_superuser_switch_role_rejected():
    client = APIClient()

    department = Department.objects.create(name='Dept 7', code='DEPT7')
    User.objects.create_user(
        employee_id='EMP007',
        username='Super Admin Switch User',
        password='password123',
        department=department,
        is_staff=True,
        is_superuser=True,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP007', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200
    access_token = login_response.data['data']['access_token']

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    switch_response = client.post(
        '/api/auth/switch-role/',
        {'role_code': 'ADMIN'},
        format='json',
    )

    assert switch_response.status_code == 403
    assert switch_response.data['code'] == 'AUTH_INVALID_ROLE'
    assert '不支持角色切换' in switch_response.data['message']
