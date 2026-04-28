from typing import Optional

import pytest
from django.core.cache import cache
from django.db import IntegrityError, transaction
from rest_framework.test import APIClient

from apps.authorization.models import Permission, UserPermissionOverride, UserScopeGroupOverride
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


def _switch_role(client: APIClient, *, role_code: str) -> dict:
    response = client.post(
        '/api/auth/switch-role/',
        {'role_code': role_code},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['code'] == 'SUCCESS'
    payload = response.data['data']
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {payload['access_token']}")
    return payload


def _login_and_get_payload(client: APIClient, *, employee_id: str, role_code: Optional[str] = None) -> dict:
    cache.clear()
    response = client.post(
        '/api/auth/login/',
        {'employee_id': employee_id, 'password': 'password123'},
        format='json',
    )
    assert response.status_code == 200
    assert response.data['code'] == 'SUCCESS'
    payload = response.data['data']
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {payload['access_token']}")
    if role_code and payload['current_role'] != role_code:
        return _switch_role(client, role_code=role_code)
    return payload


def _authenticate(client: APIClient, *, employee_id: str, role_code: Optional[str] = None) -> dict:
    return _login_and_get_payload(client, employee_id=employee_id, role_code=role_code)


def _allowed_capabilities(payload: dict) -> set[str]:
    return {
        permission_code
        for permission_code, meta in payload['capabilities'].items()
        if meta.get('allowed')
    }


@pytest.mark.django_db
def test_admin_capabilities_follow_default_menu_and_system_rules():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_ADMIN', username='Admin User', role_code='ADMIN')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_ADMIN', role_code='ADMIN')
    permissions = _allowed_capabilities(payload)

    assert 'knowledge.view' in permissions
    assert 'knowledge.create' in permissions
    assert 'knowledge.update' in permissions
    assert 'knowledge.delete' in permissions
    assert 'tag.view' in permissions
    assert 'tag.create' in permissions
    assert 'tag.update' in permissions
    assert 'tag.delete' in permissions
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

    assert 'dashboard.admin.view' in permissions
    assert 'dashboard.student.view' not in permissions
    assert 'dashboard.mentor.view' not in permissions
    assert 'task.analytics.view' not in permissions
    assert 'spot_check.view' not in permissions
    assert 'spot_check.create' not in permissions
    assert 'grading.view' not in permissions
    assert 'grading.score' not in permissions
    assert 'user.view' not in permissions
    assert 'role_permission_template.view' not in permissions
    assert 'user.role.assign' not in permissions
    assert 'user.permission.view' not in permissions
    assert 'activity_log.view' not in permissions
    assert 'activity_log.policy.update' not in permissions


@pytest.mark.django_db
def test_mentor_capabilities_follow_default_menu():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_MENTOR', username='Mentor User', role_code='MENTOR')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_MENTOR', role_code='MENTOR')
    permissions = _allowed_capabilities(payload)

    assert 'quiz.view' in permissions
    assert 'quiz.create' in permissions
    assert 'quiz.update' in permissions
    assert 'quiz.delete' in permissions
    assert 'tag.view' in permissions
    assert 'tag.create' in permissions
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

    assert 'dashboard.mentor.view' in permissions
    assert 'knowledge.view' not in permissions
    assert 'activity_log.view' not in permissions


@pytest.mark.django_db
def test_student_capabilities_follow_default_menu_and_system_rules():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_STUDENT', username='Student User', role_code='STUDENT')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_STUDENT')
    permissions = _allowed_capabilities(payload)

    assert 'knowledge.view' in permissions
    assert 'task.view' in permissions
    assert 'submission.answer' in permissions
    assert 'submission.review' in permissions
    assert 'profile.student.view' in permissions
    assert 'profile.student.update' in permissions
    assert 'dashboard.student.view' in permissions
    assert 'activity_log.view' not in permissions


@pytest.mark.django_db
def test_team_manager_capabilities_follow_default_menu():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_TM', username='Team Manager User', role_code='TEAM_MANAGER')

    payload = _login_and_get_payload(client, employee_id='EMP_AUTH_TM', role_code='TEAM_MANAGER')
    permissions = _allowed_capabilities(payload)

    assert 'knowledge.view' in permissions
    assert 'task.view' not in permissions
    assert 'activity_log.view' not in permissions


@pytest.mark.django_db
def test_permission_catalog_excludes_system_managed_permissions():
    client = APIClient()
    super_user = _create_superuser(employee_id='EMP_AUTH_CAT', username='Catalog Super')
    _authenticate(client, employee_id=super_user.employee_id)

    response = client.get('/api/authorization/permissions/')

    assert response.status_code == 200
    permission_map = {item['code']: item for item in response.data['data']}
    permission_codes = set(permission_map)
    assert 'task.view' in permission_codes
    assert 'tag.view' in permission_codes
    assert 'tag.create' in permission_codes
    assert 'user.role.assign' in permission_codes
    assert 'user.permission.view' in permission_codes
    assert 'user.permission.update' in permission_codes
    assert 'user.authorize' not in permission_codes
    assert 'role_permission_template.view' not in permission_codes
    assert 'role_permission_template.update' not in permission_codes
    assert 'activity_log.policy.update' not in permission_codes
    assert 'dashboard.student.view' not in permission_codes
    assert 'dashboard.mentor.view' not in permission_codes
    assert 'dashboard.admin.view' not in permission_codes
    assert 'profile.student.view' not in permission_codes
    assert 'profile.student.update' not in permission_codes
    assert 'submission.answer' not in permission_codes
    assert 'submission.review' not in permission_codes
    assert 'scope_aware' in permission_map['task.view']
    assert permission_map['task.view']['scope_group_key'] == 'task_resource_scope'
    assert permission_map['task.update']['scope_group_key'] == 'task_resource_scope'
    assert permission_map['task.delete']['scope_group_key'] == 'task_resource_scope'
    assert permission_map['task.view']['allowed_scope_types'] == ['SELF', 'ALL']
    assert permission_map['task.assign']['scope_group_key'] == 'task_assignment_scope'
    assert permission_map['task.analytics.view']['scope_group_key'] == 'task_assignment_scope'
    assert permission_map['spot_check.view']['scope_group_key'] == 'spot_check_student_scope'
    assert permission_map['user.view']['scope_group_key'] == 'user_scope'
    assert permission_map['question.view']['scope_group_key'] == 'question_resource_scope'
    assert permission_map['question.update']['scope_group_key'] == 'question_resource_scope'
    assert permission_map['question.delete']['scope_group_key'] == 'question_resource_scope'
    assert permission_map['question.view']['allowed_scope_types'] == ['SELF', 'ALL']
    assert permission_map['quiz.view']['scope_group_key'] == 'quiz_resource_scope'
    assert permission_map['quiz.update']['scope_group_key'] == 'quiz_resource_scope'
    assert permission_map['quiz.delete']['scope_group_key'] == 'quiz_resource_scope'
    assert permission_map['quiz.view']['allowed_scope_types'] == ['SELF', 'ALL']
    assert 'EXPLICIT_USERS' in permission_map['task.assign']['allowed_scope_types']
    assert 'role_template_visible' not in permission_map['task.view']
    assert 'user_authorization_visible' not in permission_map['task.view']


@pytest.mark.django_db
def test_permission_catalog_supports_view_filter():
    client = APIClient()
    super_user = _create_superuser(employee_id='EMP_AUTH_CAT_VIEW', username='Catalog View Super')
    _authenticate(client, employee_id=super_user.employee_id)

    role_template_response = client.get('/api/authorization/permissions/?view=role_template')
    user_authorization_response = client.get('/api/authorization/permissions/?view=user_authorization')

    assert role_template_response.status_code == 200
    assert user_authorization_response.status_code == 200
    assert 'task.view' in {item['code'] for item in role_template_response.data['data']}
    assert 'task.view' in {item['code'] for item in user_authorization_response.data['data']}
    assert 'activity_log.view' in {item['code'] for item in role_template_response.data['data']}
    assert 'activity_log.view' in {item['code'] for item in user_authorization_response.data['data']}


@pytest.mark.django_db
def test_user_permission_override_is_unique_per_user_permission_and_role():
    target_user = _create_user_with_role(
        employee_id='EMP_AUTH_OVERRIDE_UNIQ',
        username='Override Unique Target',
        role_code='MENTOR',
    )
    permission = Permission.objects.get(code='knowledge.view')

    UserPermissionOverride.objects.create(
        user=target_user,
        permission=permission,
        effect='ALLOW',
    )

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            UserPermissionOverride.objects.create(
                user=target_user,
                permission=permission,
                effect='DENY',
            )


@pytest.mark.django_db
def test_role_permission_template_unknown_role_returns_not_found():
    client = APIClient()
    super_user = _create_superuser(employee_id='EMP_AUTH_ROLE_404', username='Role 404 Super')
    _authenticate(client, employee_id=super_user.employee_id)

    response = client.get('/api/authorization/roles/NOT_A_ROLE/permissions/')

    assert response.status_code == 404
    assert response.data['code'] == 'RESOURCE_NOT_FOUND'


@pytest.mark.django_db
def test_admin_cannot_access_role_permission_template():
    client = APIClient()
    admin_user = _create_user_with_role(
        employee_id='EMP_AUTH_ROLE_TM_ADMIN',
        username='Role Template Admin',
        role_code='ADMIN',
    )
    _authenticate(client, employee_id=admin_user.employee_id, role_code='ADMIN')

    response = client.get('/api/authorization/roles/MENTOR/permissions/')

    assert response.status_code == 403
    assert response.data['code'] == 'PERMISSION_DENIED'
    assert '无权查看角色权限模板' in response.data['message']


@pytest.mark.django_db
def test_admin_cannot_access_activity_log_policy():
    client = APIClient()
    admin_user = _create_user_with_role(
        employee_id='EMP_AUTH_POLICY_ADMIN',
        username='Policy Admin',
        role_code='ADMIN',
    )
    _authenticate(client, employee_id=admin_user.employee_id, role_code='ADMIN')

    response = client.get('/api/logs/policies/')

    assert response.status_code == 403
    assert response.data['code'] == 'PERMISSION_DENIED'
    assert '无权查看日志策略' in response.data['message']


@pytest.mark.django_db
def test_system_managed_permissions_cannot_be_overridden_per_user():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_OVERRIDE_ADMIN', username='Override Super')
    target_user = _create_user_with_role(employee_id='EMP_AUTH_OVERRIDE_TARGET', username='Override Target', role_code='STUDENT')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{target_user.id}/overrides/',
        {
            'permission_code': 'submission.answer',
            'effect': 'ALLOW',
            'reason': 'should fail',
        },
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '系统保留权限' in response.data['message']


@pytest.mark.django_db
def test_permission_override_takes_effect_without_scope_payload():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_NORMALIZE_ADMIN', username='Scope Normalize Super')
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_SCOPE_NORMALIZE_MENTOR', username='Scope Normalize Mentor', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    override_response = client.post(
        f'/api/authorization/users/{mentor_user.id}/overrides/',
        {
            'permission_code': 'knowledge.update',
            'effect': 'ALLOW',
            'applies_to_role': 'MENTOR',
            'reason': 'grant permission',
        },
        format='json',
    )

    assert override_response.status_code == 201
    assert override_response.data['data']['permission_code'] == 'knowledge.update'

    payload = _authenticate(client, employee_id=mentor_user.employee_id, role_code='MENTOR')
    assert payload['capabilities']['knowledge.update']['allowed'] is True
    assert payload['capabilities']['knowledge.view']['allowed'] is True

    knowledge = Knowledge.objects.create(
        title='Scope Normalize Knowledge',
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

    _authenticate(client, employee_id=admin_user.employee_id)
    delete_response = client.delete(
        f'/api/authorization/users/{mentor_user.id}/overrides/{override_response.data["data"]["id"]}/',
    )
    assert delete_response.status_code == 200
    assert not UserPermissionOverride.objects.filter(
        user=mentor_user,
        permission__code='knowledge.update',
        applies_to_role='MENTOR',
    ).exists()


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
            'reason': 'should reject student role',
        },
        format='json',
    )

    assert response.status_code == 400
    assert not UserPermissionOverride.objects.filter(
        user=target_user,
        permission__code='knowledge.update',
    ).exists()


@pytest.mark.django_db
def test_super_admin_cannot_be_target_of_user_override():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SUPER_OVERRIDE_ADMIN', username='Super Override Admin')
    target_super_user = _create_superuser(employee_id='EMP_AUTH_SUPER_OVERRIDE_TARGET', username='Super Override Target')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{target_super_user.id}/overrides/',
        {
            'permission_code': 'knowledge.update',
            'effect': 'DENY',
            'reason': 'should reject super admin target',
        },
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '超管账号为专有角色' in response.data['message']
    assert not UserPermissionOverride.objects.filter(
        user=target_super_user,
        permission__code='knowledge.update',
    ).exists()


@pytest.mark.django_db
def test_student_current_role_ignores_user_overrides():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_STUDENT_ROLE_ADMIN', username='Student Role Super')
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_STUDENT_ROLE_TARGET', username='Student Role Target', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    create_response = client.post(
        f'/api/authorization/users/{mentor_user.id}/overrides/',
        {
            'permission_code': 'knowledge.update',
            'effect': 'ALLOW',
            'reason': 'global override for non-student roles',
        },
        format='json',
    )
    assert create_response.status_code == 201

    mentor_payload = _authenticate(client, employee_id=mentor_user.employee_id, role_code='MENTOR')
    assert mentor_payload['current_role'] == 'MENTOR'
    assert mentor_payload['capabilities']['knowledge.update']['allowed'] is True

    switch_response = client.post(
        '/api/auth/switch-role/',
        {'role_code': 'STUDENT'},
        format='json',
    )
    assert switch_response.status_code == 200
    assert switch_response.data['data']['current_role'] == 'STUDENT'
    assert switch_response.data['data']['capabilities']['knowledge.update']['allowed'] is False


@pytest.mark.django_db
def test_submission_endpoints_require_student_current_role():
    client = APIClient()
    _create_user_with_role(employee_id='EMP_AUTH_SUB_MENTOR', username='Submission Mentor', role_code='MENTOR')
    payload = _authenticate(client, employee_id='EMP_AUTH_SUB_MENTOR', role_code='MENTOR')

    assert payload['current_role'] == 'MENTOR'

    response = client.post(
        '/api/submissions/start/',
        {},
        format='json',
    )

    assert response.status_code == 403
    assert response.data['code'] == 'PERMISSION_DENIED'
    assert '只有学员角色可以进行答题和查看结果' in response.data['message']


@pytest.mark.django_db
def test_replace_role_permissions_strips_system_managed_requests():
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
    assert 'dashboard.admin.view' not in permission_codes


@pytest.mark.django_db
def test_replace_role_permissions_keeps_role_owned_dashboard_permission():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_TEMPLATE_KEEP', username='Template Keep Super')
    _create_user_with_role(employee_id='EMP_AUTH_TEMPLATE_KEEP_M', username='Template Keep Mentor', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.put(
        '/api/authorization/roles/MENTOR/permissions/',
        {
            'role_code': 'MENTOR',
            'permission_codes': [
                'task.view',
                'quiz.view',
            ],
        },
        format='json',
    )

    assert response.status_code == 200
    permission_codes = set(response.data['data']['permission_codes'])
    assert 'task.view' in permission_codes
    assert 'quiz.view' in permission_codes
    assert 'dashboard.mentor.view' in permission_codes


@pytest.mark.django_db
def test_replace_role_permissions_auto_adds_implied_permissions():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_TEMPLATE_IMPLY', username='Template Imply Super')
    _create_user_with_role(employee_id='EMP_AUTH_TEMPLATE_IMPLY_M', username='Template Imply Mentor', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.put(
        '/api/authorization/roles/MENTOR/permissions/',
        {
            'role_code': 'MENTOR',
            'permission_codes': [
                'grading.score',
            ],
        },
        format='json',
    )

    assert response.status_code == 200
    permission_codes = set(response.data['data']['permission_codes'])
    assert 'grading.score' in permission_codes
    assert 'grading.view' in permission_codes
    assert 'task.view' in permission_codes
    assert 'dashboard.mentor.view' in permission_codes


@pytest.mark.django_db
def test_replace_team_manager_permissions_keeps_team_manager_dashboard_permission():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_TM_KEEP', username='Team Manager Keep Super')
    _create_user_with_role(employee_id='EMP_AUTH_TM_KEEP_USER', username='Team Manager Keep User', role_code='TEAM_MANAGER')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.put(
        '/api/authorization/roles/TEAM_MANAGER/permissions/',
        {
            'role_code': 'TEAM_MANAGER',
            'permission_codes': [
                'knowledge.view',
            ],
        },
        format='json',
    )

    assert response.status_code == 200
    permission_codes = set(response.data['data']['permission_codes'])
    assert 'knowledge.view' in permission_codes
    assert 'dashboard.team_manager.view' in permission_codes


@pytest.mark.django_db
def test_replace_non_admin_role_permissions_allows_log_management_requests():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_CFG_TEMPLATE', username='Cfg Template Super')
    _create_user_with_role(employee_id='EMP_AUTH_CFG_TEMPLATE_M', username='Cfg Template Mentor', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.put(
        '/api/authorization/roles/MENTOR/permissions/',
        {
            'role_code': 'MENTOR',
            'permission_codes': [
                'task.view',
                'activity_log.view',
            ],
        },
        format='json',
    )

    assert response.status_code == 200
    permission_codes = set(response.data['data']['permission_codes'])
    assert 'task.view' in permission_codes
    assert 'activity_log.view' in permission_codes


@pytest.mark.django_db
def test_role_permission_template_response_includes_default_scope_types():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_ADMIN', username='Scope Super')
    Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.get('/api/authorization/roles/MENTOR/permissions/')

    assert response.status_code == 200
    payload = response.data['data']
    assert payload['role_code'] == 'MENTOR'
    assert payload['default_scope_types'] == ['SELF', 'MENTEES']
    scope_group_map = {item['key']: item for item in payload['scope_groups']}
    assert scope_group_map['question_resource_scope']['default_scope_types'] == ['SELF']
    assert set(scope_group_map['question_resource_scope']['permission_codes']) == {
        'question.view',
        'question.update',
        'question.delete',
    }
    assert scope_group_map['quiz_resource_scope']['default_scope_types'] == ['SELF']
    assert set(scope_group_map['quiz_resource_scope']['permission_codes']) == {
        'quiz.view',
        'quiz.update',
        'quiz.delete',
    }
    assert scope_group_map['task_resource_scope']['default_scope_types'] == ['SELF']
    assert set(scope_group_map['task_resource_scope']['permission_codes']) == {
        'task.view',
        'task.update',
        'task.delete',
    }
    assert scope_group_map['task_assignment_scope']['default_scope_types'] == ['MENTEES']
    assert set(scope_group_map['task_assignment_scope']['permission_codes']) == {'task.assign', 'task.analytics.view'}
    assert scope_group_map['spot_check_student_scope']['default_scope_types'] == ['MENTEES']
    assert scope_group_map['user_scope']['default_scope_types'] == ['MENTEES']


@pytest.mark.django_db
def test_sync_authorization_restores_role_default_scope_groups():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_GROUP_SYNC', username='Scope Group Sync Super')
    Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.get('/api/authorization/roles/MENTOR/permissions/')

    assert response.status_code == 200
    scope_group_map = {item['key']: item for item in response.data['data']['scope_groups']}
    assert scope_group_map['question_resource_scope']['default_scope_types'] == ['SELF']
    assert scope_group_map['quiz_resource_scope']['default_scope_types'] == ['SELF']
    assert scope_group_map['task_resource_scope']['default_scope_types'] == ['SELF']
    assert scope_group_map['task_assignment_scope']['default_scope_types'] == ['MENTEES']
    assert scope_group_map['spot_check_student_scope']['default_scope_types'] == ['MENTEES']
    assert scope_group_map['user_scope']['default_scope_types'] == ['MENTEES']


@pytest.mark.django_db
def test_user_override_rejects_legacy_scope_payload():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_FIX_ADMIN', username='Scope Fix Admin')
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_SCOPE_FIX_MENTOR', username='Scope Fix Mentor', role_code='MENTOR')
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{mentor_user.id}/overrides/',
        {
            'permission_code': 'user.role.assign',
            'effect': 'ALLOW',
            'applies_to_role': 'MENTOR',
            'scope_type': 'SELF',
            'scope_user_ids': [],
        },
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '不支持的字段' in str(response.data)
    assert not UserPermissionOverride.objects.filter(user=mentor_user, permission__code='user.role.assign').exists()


@pytest.mark.django_db
def test_non_admin_role_can_create_log_management_permission_override():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_CFG_OVERRIDE_ADMIN', username='Cfg Override Super')
    mentor_user = _create_user_with_role(
        employee_id='EMP_AUTH_CFG_OVERRIDE_MENTOR',
        username='Cfg Override Mentor',
        role_code='MENTOR',
    )
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{mentor_user.id}/overrides/',
        {
            'permission_code': 'activity_log.view',
            'effect': 'ALLOW',
            'applies_to_role': 'MENTOR',
            'reason': 'grant log management access',
        },
        format='json',
    )

    assert response.status_code == 201
    assert response.data['data']['permission_code'] == 'activity_log.view'
    assert UserPermissionOverride.objects.filter(
        user=mentor_user,
        permission__code='activity_log.view',
        applies_to_role='MENTOR',
    ).exists()


@pytest.mark.django_db
def test_user_scope_group_override_api_creates_and_lists_records():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_GROUP_ADMIN', username='Scope Group Super')
    mentor_user = _create_user_with_role(
        employee_id='EMP_AUTH_SCOPE_GROUP_MENTOR',
        username='Scope Group Mentor',
        role_code='MENTOR',
    )
    extra_user = _create_user_with_role(
        employee_id='EMP_AUTH_SCOPE_GROUP_EXTRA',
        username='Scope Group Extra',
        role_code='STUDENT',
    )
    _authenticate(client, employee_id=admin_user.employee_id)

    create_response = client.post(
        f'/api/authorization/users/{mentor_user.id}/scope-group-overrides/',
        {
            'scope_group_key': 'task_assignment_scope',
            'effect': 'ALLOW',
            'applies_to_role': 'MENTOR',
            'scope_type': 'EXPLICIT_USERS',
            'scope_user_ids': [extra_user.id],
        },
        format='json',
    )

    assert create_response.status_code == 201
    assert create_response.data['data']['scope_group_key'] == 'task_assignment_scope'
    assert create_response.data['data']['scope_user_ids'] == [extra_user.id]
    assert UserScopeGroupOverride.objects.filter(
        user=mentor_user,
        scope_group_key='task_assignment_scope',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
    ).exists()

    list_response = client.get(f'/api/authorization/users/{mentor_user.id}/scope-group-overrides/')
    assert list_response.status_code == 200
    payload = list_response.data['data']
    assert len(payload) == 1
    assert payload[0]['scope_group_key'] == 'task_assignment_scope'

    delete_response = client.delete(
        f'/api/authorization/users/{mentor_user.id}/scope-group-overrides/{create_response.data["data"]["id"]}/',
    )
    assert delete_response.status_code == 200
    assert not UserScopeGroupOverride.objects.filter(
        user=mentor_user,
        scope_group_key='task_assignment_scope',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
    ).exists()


@pytest.mark.django_db
def test_resource_scope_group_override_rejects_explicit_users():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_RES_SCOPE_ADMIN', username='Resource Scope Super')
    mentor_user = _create_user_with_role(
        employee_id='EMP_AUTH_RES_SCOPE_MENTOR',
        username='Resource Scope Mentor',
        role_code='MENTOR',
    )
    extra_user = _create_user_with_role(
        employee_id='EMP_AUTH_RES_SCOPE_EXTRA',
        username='Resource Scope Extra',
        role_code='MENTOR',
    )
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{mentor_user.id}/scope-group-overrides/',
        {
            'scope_group_key': 'question_resource_scope',
            'effect': 'ALLOW',
            'applies_to_role': 'MENTOR',
            'scope_type': 'EXPLICIT_USERS',
            'scope_user_ids': [extra_user.id],
        },
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '不支持 EXPLICIT_USERS 范围' in response.data['message']
    assert not UserScopeGroupOverride.objects.filter(
        user=mentor_user,
        scope_group_key='question_resource_scope',
        scope_type='EXPLICIT_USERS',
    ).exists()


@pytest.mark.django_db
def test_scope_aware_permission_override_api_rejects_scoped_payload():
    client = APIClient()
    admin_user = _create_superuser(employee_id='EMP_AUTH_SCOPE_OVERRIDE_ADMIN', username='Scope Override Super')
    mentor_user = _create_user_with_role(
        employee_id='EMP_AUTH_SCOPE_OVERRIDE_MENTOR',
        username='Scope Override Mentor',
        role_code='MENTOR',
    )
    extra_user = _create_user_with_role(
        employee_id='EMP_AUTH_SCOPE_OVERRIDE_EXTRA',
        username='Scope Override Extra',
        role_code='STUDENT',
    )
    _authenticate(client, employee_id=admin_user.employee_id)

    response = client.post(
        f'/api/authorization/users/{mentor_user.id}/overrides/',
        {
            'permission_code': 'task.assign',
            'effect': 'ALLOW',
            'applies_to_role': 'MENTOR',
            'scope_type': 'EXPLICIT_USERS',
            'scope_user_ids': [extra_user.id],
        },
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '不支持的字段' in str(response.data)
    assert not UserPermissionOverride.objects.filter(
        user=mentor_user,
        permission__code='task.assign',
        applies_to_role='MENTOR',
    ).exists()


@pytest.mark.django_db
def test_dashboard_endpoints_follow_current_role_system_permissions():
    client = APIClient()
    mentor_user = _create_user_with_role(employee_id='EMP_AUTH_M_DASH', username='Mentor Dash', role_code='MENTOR')
    _authenticate(client, employee_id=mentor_user.employee_id, role_code='MENTOR')

    student_dashboard_response = client.get('/api/dashboard/student/')

    assert student_dashboard_response.status_code == 403
    assert student_dashboard_response.data['code'] == 'PERMISSION_DENIED'


@pytest.mark.django_db
def test_dashboard_permissions_and_endpoints_switch_with_current_role():
    client = APIClient()
    user = _create_user_with_role(employee_id='EMP_AUTH_ROLE_SWITCH_DASH', username='Role Switch Dash', role_code='MENTOR')
    student_role, _ = Role.objects.get_or_create(code='STUDENT', defaults={'name': 'STUDENT'})
    UserRole.objects.get_or_create(user=user, role=student_role)

    student_payload = _authenticate(client, employee_id=user.employee_id)
    assert student_payload['current_role'] == 'STUDENT'
    assert student_payload['capabilities']['dashboard.student.view']['allowed'] is True
    assert student_payload['capabilities']['dashboard.mentor.view']['allowed'] is False

    student_dashboard_response = client.get('/api/dashboard/student/')
    mentor_dashboard_response = client.get('/api/dashboard/mentor/')
    assert student_dashboard_response.status_code == 200
    assert mentor_dashboard_response.status_code == 403

    switch_payload = _switch_role(client, role_code='MENTOR')
    assert switch_payload['current_role'] == 'MENTOR'
    assert switch_payload['capabilities']['dashboard.mentor.view']['allowed'] is True
    assert switch_payload['capabilities']['dashboard.student.view']['allowed'] is False

    switched_mentor_dashboard_response = client.get('/api/dashboard/mentor/')
    switched_student_dashboard_response = client.get('/api/dashboard/student/')
    assert switched_mentor_dashboard_response.status_code == 200
    assert switched_student_dashboard_response.status_code == 403


@pytest.mark.django_db
def test_super_admin_capabilities_include_all_system_managed_codes():
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
    permissions = _allowed_capabilities(payload)

    assert payload['current_role'] == 'SUPER_ADMIN'
    assert 'user.view' in permissions
    assert 'knowledge.view' in permissions
    assert 'dashboard.admin.view' in permissions
    assert 'dashboard.student.view' in permissions
    assert 'dashboard.mentor.view' in permissions
    assert 'submission.answer' in permissions
    assert 'activity_log.view' in permissions
