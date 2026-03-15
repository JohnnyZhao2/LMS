import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.authorization.models import Permission, UserPermissionOverride
from apps.users.models import Department, Role, User, UserRole


def _create_user_with_role(*, employee_id: str, username: str, role_code: str) -> User:
    suffix = employee_id[-6:]
    department = Department.objects.create(name=f'Department {suffix}', code=f'D{suffix}')
    role, _ = Role.objects.get_or_create(code=role_code, defaults={'name': role_code})
    user = User.objects.create_user(
        employee_id=employee_id,
        username=username,
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=role)
    return user


def _login_and_get_payload(client: APIClient, *, employee_id: str) -> dict:
    cache.clear()
    response = client.post(
        '/api/auth/login/',
        {'employee_id': employee_id, 'password': 'password123'},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['code'] == 'SUCCESS'
    return response.data['data']


def _authenticate(client: APIClient, *, employee_id: str) -> dict:
    payload = _login_and_get_payload(client, employee_id=employee_id)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {payload['access_token']}")
    return payload


@pytest.mark.django_db
def test_admin_effective_permissions_follow_default_menu_and_system_rules():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_ADMIN', username='Admin User', role_code='ADMIN')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_ADMIN')
    permissions = set(payload['effective_permissions'])

    assert 'activity_log.view' in permissions
    assert 'activity_log.policy.update' in permissions
    assert 'knowledge.view' in permissions
    assert 'knowledge.create' in permissions
    assert 'knowledge.update' in permissions
    assert 'knowledge.delete' in permissions
    assert 'quiz.view' in permissions
    assert 'quiz.create' in permissions
    assert 'quiz.update' in permissions
    assert 'quiz.delete' in permissions
    assert 'task.view' in permissions
    assert 'task.create' in permissions
    assert 'task.update' in permissions
    assert 'task.delete' in permissions
    assert 'task.assign' in permissions
    assert 'user.view' in permissions
    assert 'user.create' in permissions
    assert 'user.update' in permissions
    assert 'user.delete' in permissions
    assert 'user.activate' in permissions
    assert 'user.deactivate' in permissions
    assert 'user.reset_password' in permissions
    assert 'user.assign_roles' in permissions
    assert 'user.assign_mentor' in permissions
    assert 'authorization.role_template.view' in permissions
    assert 'authorization.role_template.update' in permissions
    assert 'authorization.user_override.view' in permissions
    assert 'authorization.user_override.create' in permissions
    assert 'authorization.user_override.revoke' in permissions

    assert 'dashboard.admin.view' not in permissions
    assert 'dashboard.student.view' not in permissions
    assert 'dashboard.mentor.view' not in permissions
    assert 'dashboard.team_manager.view' not in permissions
    assert 'spot_check.view' not in permissions
    assert 'spot_check.create' not in permissions
    assert 'grading.view' in permissions
    assert 'grading.score' in permissions


@pytest.mark.django_db
def test_mentor_effective_permissions_follow_default_menu():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_MENTOR', username='Mentor User', role_code='MENTOR')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_MENTOR')
    permissions = set(payload['effective_permissions'])

    assert 'quiz.view' in permissions
    assert 'quiz.create' in permissions
    assert 'quiz.update' in permissions
    assert 'quiz.delete' in permissions
    assert 'task.view' in permissions
    assert 'task.create' in permissions
    assert 'task.update' in permissions
    assert 'task.delete' in permissions
    assert 'task.assign' in permissions
    assert 'spot_check.view' in permissions
    assert 'spot_check.create' in permissions
    assert 'spot_check.update' in permissions
    assert 'spot_check.delete' in permissions
    assert 'question.view' in permissions
    assert 'question.create' in permissions
    assert 'question.update' in permissions
    assert 'question.delete' in permissions
    assert 'grading.view' in permissions
    assert 'grading.score' in permissions

    assert 'dashboard.mentor.view' not in permissions
    assert 'knowledge.view' not in permissions
    assert 'activity_log.view' not in permissions


@pytest.mark.django_db
def test_student_effective_permissions_follow_default_menu_and_system_rules():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_STUDENT', username='Student User', role_code='STUDENT')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_STUDENT')
    permissions = set(payload['effective_permissions'])

    assert 'knowledge.view' in permissions
    assert 'task.view' in permissions
    assert 'submission.answer' in permissions
    assert 'submission.review' in permissions
    assert 'profile.view' in permissions
    assert 'profile.update' in permissions
    assert 'analytics.view' not in permissions
    assert 'activity_log.view' not in permissions


@pytest.mark.django_db
def test_team_manager_effective_permissions_follow_default_menu():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_TM', username='Team Manager User', role_code='TEAM_MANAGER')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_TM')
    permissions = set(payload['effective_permissions'])

    assert 'knowledge.view' in permissions
    assert 'analytics.view' in permissions
    assert 'task.view' not in permissions
    assert 'dashboard.team_manager.view' not in permissions
    assert 'activity_log.view' not in permissions


@pytest.mark.django_db
def test_permission_catalog_excludes_system_managed_permissions():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_CAT', username='Catalog Admin', role_code='ADMIN')
    _authenticate(client, employee_id='EMP_AUTH_CAT')

    response = client.get('/api/authorization/permissions/')

    assert response.status_code == 200
    permission_codes = {item['code'] for item in response.data['data']}
    assert 'task.view' in permission_codes
    assert 'dashboard.student.view' not in permission_codes
    assert 'dashboard.mentor.view' not in permission_codes
    assert 'dashboard.team_manager.view' not in permission_codes
    assert 'dashboard.admin.view' not in permission_codes
    assert 'analytics.view' not in permission_codes
    assert 'profile.view' not in permission_codes
    assert 'profile.update' not in permission_codes
    assert 'submission.answer' not in permission_codes
    assert 'submission.review' not in permission_codes
    assert 'activity_log.view' not in permission_codes
    assert 'activity_log.policy.update' not in permission_codes


@pytest.mark.django_db
def test_system_managed_permissions_cannot_be_overridden_per_user():
    client = APIClient()
    admin_user = _create_user_with_role(employee_id='EMP_AUTH_OVERRIDE_ADMIN', username='Override Admin', role_code='ADMIN')
    target_user = _create_user_with_role(employee_id='EMP_AUTH_OVERRIDE_TARGET', username='Override Target', role_code='STUDENT')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{target_user.id}/overrides/',
        {
            'permission_code': 'activity_log.view',
            'effect': 'ALLOW',
            'scope_type': 'ALL',
            'reason': 'should fail',
        },
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '系统保留权限' in response.data['message']


@pytest.mark.django_db
def test_submission_endpoints_require_student_current_role():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_SUB_MENTOR', username='Submission Mentor', role_code='MENTOR')
    payload = _authenticate(client, employee_id='EMP_AUTH_SUB_MENTOR')

    assert payload['current_role'] == 'MENTOR'

    response = client.post(
        '/api/submissions/start/',
        {},
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'PERMISSION_DENIED'
    assert '只有学员角色可以进行答题和查看结果' in response.data['message']


@pytest.mark.django_db
def test_replace_role_permissions_preserves_role_dashboard_and_strips_system_managed_requests():
    client = APIClient()
    admin_user = _create_user_with_role(employee_id='EMP_AUTH_TEMPLATE', username='Template Admin', role_code='ADMIN')
    _create_user_with_role(employee_id='EMP_AUTH_TEMPLATE_M', username='Template Mentor', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.put(
        '/api/authorization/roles/MENTOR/permissions/',
        {
            'role_code': 'MENTOR',
            'permission_codes': [
                'task.view',
                'task.create',
                'quiz.view',
                'activity_log.view',
                'dashboard.admin.view',
            ],
        },
        format='json',
    )

    assert response.status_code == 200
    permission_codes = set(response.data['data']['permission_codes'])
    assert 'task.view' in permission_codes
    assert 'task.create' in permission_codes
    assert 'quiz.view' in permission_codes
    assert 'activity_log.view' not in permission_codes
    assert 'dashboard.admin.view' not in permission_codes


@pytest.mark.django_db
def test_role_permission_template_response_includes_default_scope_types():
    client = APIClient()
    admin_user = _create_user_with_role(employee_id='EMP_AUTH_SCOPE_ADMIN', username='Scope Admin', role_code='ADMIN')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.get('/api/authorization/roles/MENTOR/permissions/')

    assert response.status_code == 200
    payload = response.data['data']
    assert payload['role_code'] == 'MENTOR'
    assert payload['default_scope_types'] == ['MENTEES']
    assert any(option['code'] == 'MENTEES' and option['inherited_by_default'] for option in payload['scope_options'])
    assert any(option['code'] == 'EXPLICIT_USERS' and not option['inherited_by_default'] for option in payload['scope_options'])
    assert all(option['code'] != 'SELF' for option in payload['scope_options'])


@pytest.mark.django_db
def test_self_scoped_override_does_not_grant_global_page_access_without_target_user():
    client = APIClient()
    admin_user = _create_user_with_role(employee_id='EMP_AUTH_SCOPE_FIX_ADMIN', username='Scope Fix Admin', role_code='ADMIN')
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_SCOPE_FIX_MENTOR', username='Scope Fix Mentor', role_code='MENTOR')
    permission = Permission.objects.get(code='authorization.user_override.view')

    UserPermissionOverride.objects.create(
        user=mentor_user,
        permission=permission,
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='SELF',
        scope_user_ids=[],
        granted_by=admin_user,
    )

    _authenticate(client, employee_id=mentor_user.employee_id)
    response = client.get('/api/authorization/permissions/')

    assert response.status_code == 400
    assert response.data['code'] == 'PERMISSION_DENIED'


@pytest.mark.django_db
def test_dashboard_endpoints_are_guarded_by_current_role_not_permission_codes():
    client = APIClient()
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_M_DASH', username='Mentor Dash', role_code='MENTOR')
    _authenticate(client, employee_id=mentor_user.employee_id)

    student_dashboard_response = client.get('/api/dashboard/student/')
    team_manager_dashboard_response = client.get('/api/dashboard/team-manager/')

    assert student_dashboard_response.status_code == 400
    assert student_dashboard_response.data['code'] == 'PERMISSION_DENIED'
    assert team_manager_dashboard_response.status_code == 400
    assert team_manager_dashboard_response.data['code'] == 'PERMISSION_DENIED'
