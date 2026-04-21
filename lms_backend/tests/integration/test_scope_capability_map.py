import pytest
from rest_framework.test import APIClient

from apps.authorization.models import Permission, Role, UserScopeGroupOverride
from apps.users.models import Department, User, UserRole


def _switch_role(client: APIClient, role_code: str) -> dict:
    response = client.post(
        '/api/auth/switch-role/',
        {'role_code': role_code},
        format='json',
    )
    assert response.status_code == 200
    payload = response.data['data']
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {payload['access_token']}")
    return payload


@pytest.mark.django_db
def test_scope_allow_override_marks_user_view_capability_as_allowed():
    client = APIClient()

    department = Department.objects.create(name='范围权限菜单部门', code='SCOPE_CAP_MENU')
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})

    mentor = User.objects.create_user(
        employee_id='EMP_SCOPE_MENU_001',
        username='范围菜单导师',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=mentor, role=mentor_role)

    user_view_permission = Permission.objects.get(code='user.view')
    user_view_permission.user_overrides.create(
        user=mentor,
        effect='ALLOW',
        applies_to_role='MENTOR',
        granted_by=mentor,
    )
    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='user_scope',
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='MENTEES',
        granted_by=mentor,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP_SCOPE_MENU_001', 'password': 'password123'},
        format='json',
    )

    assert login_response.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['data']['access_token']}")
    payload = _switch_role(client, 'MENTOR')
    assert payload['current_role'] == 'MENTOR'
    assert payload['capabilities']['user.view']['allowed'] is True


@pytest.mark.django_db
def test_scope_allow_override_allows_user_list_access_with_scoped_results():
    client = APIClient()

    department = Department.objects.create(name='范围用户列表部门', code='SCOPE_USER_LIST')
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})

    mentor = User.objects.create_user(
        employee_id='EMP_SCOPE_LIST_001',
        username='范围列表导师',
        password='password123',
        department=department,
    )
    mentee = User.objects.create_user(
        employee_id='EMP_SCOPE_LIST_002',
        username='范围列表学员',
        password='password123',
        department=department,
        mentor=mentor,
    )
    outsider = User.objects.create_user(
        employee_id='EMP_SCOPE_LIST_003',
        username='范围列表路人',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=mentor, role=mentor_role)

    user_view_permission = Permission.objects.get(code='user.view')
    user_view_permission.user_overrides.create(
        user=mentor,
        effect='ALLOW',
        applies_to_role='MENTOR',
        granted_by=mentor,
    )
    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='user_scope',
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='MENTEES',
        granted_by=mentor,
    )

    login_response = client.post(
        '/api/auth/login/',
        {'employee_id': 'EMP_SCOPE_LIST_001', 'password': 'password123'},
        format='json',
    )
    assert login_response.status_code == 200

    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_response.data['data']['access_token']}")
    _switch_role(client, 'MENTOR')

    list_response = client.get('/api/users/')
    assert list_response.status_code == 200
    user_ids = {item['id'] for item in list_response.data['data']}
    assert mentee.id in user_ids
    assert outsider.id not in user_ids
