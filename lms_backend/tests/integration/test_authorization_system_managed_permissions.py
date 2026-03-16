import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from apps.authorization.models import Permission, UserPermissionOverride
from apps.knowledge.models import Knowledge
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


def _create_superuser(*, employee_id: str, username: str) -> User:
    suffix = employee_id[-6:]
    department = Department.objects.create(name=f'Super Department {suffix}', code=f'S{suffix}')
    return User.objects.create_user(
        employee_id=employee_id,
        username=username,
        password='password123',
        department=department,
        is_staff=True,
        is_superuser=True,
    )


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

    assert 'knowledge.view' in permissions
    assert 'knowledge.create' in permissions
    assert 'knowledge.update' in permissions
    assert 'knowledge.delete' in permissions
    assert 'quiz.view' in permissions
    assert 'quiz.create' in permissions
    assert 'quiz.update' in permissions
    assert 'quiz.delete' in permissions
    assert 'question.view' in permissions
    assert 'question.create' in permissions
    assert 'question.update' in permissions
    assert 'question.delete' in permissions
    assert 'task.view' in permissions
    assert 'task.create' in permissions
    assert 'task.update' in permissions
    assert 'task.delete' in permissions
    assert 'task.assign' in permissions

    assert 'dashboard.admin.view' not in permissions
    assert 'dashboard.student.view' not in permissions
    assert 'dashboard.mentor.view' not in permissions
    assert 'dashboard.team_manager.view' not in permissions
    assert 'task.analytics.view' not in permissions
    assert 'spot_check.view' not in permissions
    assert 'spot_check.create' not in permissions
    assert 'grading.view' not in permissions
    assert 'grading.score' not in permissions
    assert 'user.view' not in permissions
    assert 'authorization.role_template.view' not in permissions
    assert 'user.authorization.manage' not in permissions
    assert 'activity_log.view' not in permissions
    assert 'activity_log.policy.update' not in permissions


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
    super_user = _create_superuser(employee_id='EMP_AUTH_CAT', username='Catalog Super')
    _authenticate(client, employee_id=super_user.employee_id)

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
    admin_user = _create_superuser(employee_id='EMP_AUTH_OVERRIDE_ADMIN', username='Override Super')
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
def test_non_scope_permission_override_is_normalized_to_all_and_takes_effect():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_NORMALIZE_ADMIN', username='Scope Normalize Super')
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_SCOPE_NORMALIZE_MENTOR', username='Scope Normalize Mentor', role_code='MENTOR')
    student_user = _create_user_with_role(employee_id='EMP_AUTH_SCOPE_NORMALIZE_STU', username='Scope Normalize Student', role_code='STUDENT')
    _authenticate(client, employee_id=admin_user.employee_id)

    override_response = client.post(
        f'/api/authorization/users/{mentor_user.id}/overrides/',
        {
            'permission_code': 'knowledge.update',
            'effect': 'ALLOW',
            'applies_to_role': 'MENTOR',
            'scope_type': 'EXPLICIT_USERS',
            'scope_user_ids': [student_user.id],
            'reason': 'normalize to global',
        },
        format='json',
    )

    assert override_response.status_code == 201
    assert override_response.data['data']['scope_type'] == 'ALL'
    assert override_response.data['data']['scope_user_ids'] == []

    payload = _authenticate(client, employee_id=mentor_user.employee_id)
    assert 'knowledge.update' in set(payload['effective_permissions'])

    knowledge = Knowledge.objects.create(
        title='Scope Normalize Knowledge',
        knowledge_type='OTHER',
        content='original content',
        created_by=admin_user,
        updated_by=admin_user,
    )

    patch_response = client.patch(
        f'/api/knowledge/{knowledge.id}/',
        {'title': 'Scope Normalize Knowledge Updated'},
        format='json',
    )
    assert patch_response.status_code == 200


@pytest.mark.django_db
def test_student_role_cannot_be_used_for_user_override_applies_to_role():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_STUDENT_OVERRIDE_ADMIN', username='Student Override Super')
    target_user = _create_user_with_role(employee_id='EMP_AUTH_STUDENT_OVERRIDE_TARGET', username='Student Override Target', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{target_user.id}/overrides/',
        {
            'permission_code': 'knowledge.update',
            'effect': 'ALLOW',
            'applies_to_role': 'STUDENT',
            'scope_type': 'ALL',
            'reason': 'should reject student role',
        },
        format='json',
    )

    assert response.status_code == 400
    assert not UserPermissionOverride.objects.filter(
        user=target_user,
        permission__code='knowledge.update',
        is_active=True,
    ).exists()


@pytest.mark.django_db
def test_student_current_role_ignores_user_permission_overrides():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_STUDENT_ROLE_ADMIN', username='Student Role Super')
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_STUDENT_ROLE_TARGET', username='Student Role Target', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    create_response = client.post(
        f'/api/authorization/users/{mentor_user.id}/overrides/',
        {
            'permission_code': 'knowledge.update',
            'effect': 'ALLOW',
            'scope_type': 'ALL',
            'reason': 'global override for non-student roles',
        },
        format='json',
    )
    assert create_response.status_code == 201

    mentor_payload = _authenticate(client, employee_id=mentor_user.employee_id)
    assert mentor_payload['current_role'] == 'MENTOR'
    assert 'knowledge.update' in set(mentor_payload['effective_permissions'])

    switch_response = client.post(
        '/api/auth/switch-role/',
        {'role_code': 'STUDENT'},
        format='json',
    )
    assert switch_response.status_code == 200
    assert switch_response.data['data']['current_role'] == 'STUDENT'
    assert 'knowledge.update' not in set(switch_response.data['data']['effective_permissions'])


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
    admin_user = _create_superuser(employee_id='EMP_AUTH_TEMPLATE', username='Template Super')
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
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_ADMIN', username='Scope Super')
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
    permission = Permission.objects.get(code='user.authorization.manage')

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


@pytest.mark.django_db
def test_super_admin_effective_permissions_include_all_system_managed_codes():
    client = APIClient()
    department = Department.objects.create(name='Dept Super Auth', code='D_SUPER_AUTH')
    User.objects.create_user(
        employee_id='EMP_AUTH_SUPER',
        username='Super Auth User',
        password='password123',
        department=department,
        is_staff=True,
        is_superuser=True,
    )

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_SUPER')
    permissions = set(payload['effective_permissions'])

    assert payload['current_role'] == 'SUPER_ADMIN'
    assert 'user.view' in permissions
    assert 'knowledge.view' in permissions
    assert 'dashboard.admin.view' in permissions
    assert 'dashboard.student.view' in permissions
    assert 'dashboard.mentor.view' in permissions
    assert 'dashboard.team_manager.view' in permissions
    assert 'submission.answer' in permissions
    assert 'activity_log.view' in permissions
