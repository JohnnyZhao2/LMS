import pytest
from typing import Optional

from rest_framework.test import APIClient

from apps.authorization.models import UserScopeGroupOverride
from apps.users.models import Department, Role, User, UserRole


def _create_user(*, employee_id: str, username: str, department: Department, role_codes: Optional[list[str]] = None) -> User:
    user = User.objects.create_user(
        employee_id=employee_id,
        username=username,
        password='password123',
        department=department,
    )
    for role_code in role_codes or []:
        role, _ = Role.objects.get_or_create(code=role_code, defaults={'name': role_code})
        UserRole.objects.get_or_create(user=user, role=role)
    return user


def _create_superuser(*, employee_id: str, username: str, department: Department) -> User:
    return User.objects.create_user(
        employee_id=employee_id,
        username=username,
        password='password123',
        department=department,
        is_staff=True,
        is_superuser=True,
    )

def _remove_student_role(user: User) -> None:
    UserRole.objects.filter(user=user, role__code='STUDENT').delete()


def _create_non_student_user(
    *,
    employee_id: str,
    username: str,
    department: Department,
    role_code: str,
) -> User:
    user = _create_user(
        employee_id=employee_id,
        username=username,
        department=department,
        role_codes=[role_code],
    )
    _remove_student_role(user)
    return user


def _extract_list_items(response):
    return response.data['data']['results']

@pytest.mark.django_db
def test_task_assign_scope_supports_default_plus_explicit_allow_and_deny():
    client = APIClient()
    department = Department.objects.create(name='范围测试部门', code='SCOPE_RANGE_D1')

    mentor = _create_user(
        employee_id='SCOPE_MENTOR_001',
        username='范围导师',
        department=department,
        role_codes=['MENTOR'],
    )
    admin = _create_user(
        employee_id='SCOPE_ADMIN_001',
        username='范围管理员',
        department=department,
        role_codes=['ADMIN'],
    )
    mentee = _create_user(
        employee_id='SCOPE_STU_MENTEE',
        username='名下学员',
        department=department,
    )
    extra_student = _create_user(
        employee_id='SCOPE_STU_EXTRA',
        username='额外学员',
        department=department,
    )

    mentee.mentor = mentor
    mentee.save(update_fields=['mentor'])

    client.force_authenticate(user=mentor)

    response = client.get('/api/tasks/assignable-users/')
    assert response.status_code == 200
    student_ids = {item['id'] for item in response.data['data']}
    assert mentee.id in student_ids
    assert extra_student.id not in student_ids

    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='task_student_scope',
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[extra_student.id],
        granted_by=admin,
    )

    response = client.get('/api/tasks/assignable-users/')
    assert response.status_code == 200
    student_ids = {item['id'] for item in response.data['data']}
    assert mentee.id in student_ids
    assert extra_student.id in student_ids

    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='task_student_scope',
        effect='DENY',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[mentee.id],
        granted_by=admin,
    )

    response = client.get('/api/tasks/assignable-users/')
    assert response.status_code == 200
    student_ids = {item['id'] for item in response.data['data']}
    assert mentee.id not in student_ids
    assert extra_student.id in student_ids


@pytest.mark.django_db
def test_user_view_scope_supports_mentees_and_non_student_overrides(grant_permissions_to_roles):
    client = APIClient()
    department = Department.objects.create(name='用户查看范围部门', code='SCOPE_RANGE_D5')

    grant_permissions_to_roles(role_codes=['MENTOR', 'ADMIN'], permission_codes=['user.view'])

    mentor = _create_user(
        employee_id='SCOPE_USER_VIEW_MENTOR',
        username='用户查看导师',
        department=department,
        role_codes=['MENTOR'],
    )
    admin = _create_user(
        employee_id='SCOPE_USER_VIEW_ADMIN',
        username='用户查看管理员',
        department=department,
        role_codes=['ADMIN'],
    )
    mentee = _create_user(
        employee_id='SCOPE_USER_VIEW_STUDENT',
        username='名下学生',
        department=department,
    )
    mentee_non_student = _create_non_student_user(
        employee_id='SCOPE_USER_VIEW_NST_1',
        username='名下管理员',
        department=department,
        role_code='ADMIN',
    )
    outsider_non_student = _create_non_student_user(
        employee_id='SCOPE_USER_VIEW_NST_2',
        username='额外管理员',
        department=department,
        role_code='ADMIN',
    )

    mentee.mentor = mentor
    mentee.save(update_fields=['mentor'])
    mentee_non_student.mentor = mentor
    mentee_non_student.save(update_fields=['mentor'])

    client.force_authenticate(user=mentor)

    response = client.get('/api/users/')
    assert response.status_code == 200
    visible_user_ids = {item['id'] for item in response.data['data']}
    assert mentee.id in visible_user_ids
    assert mentee_non_student.id in visible_user_ids
    assert outsider_non_student.id not in visible_user_ids

    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='user_scope',
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[outsider_non_student.id],
        granted_by=admin,
    )

    response = client.get('/api/users/')
    assert response.status_code == 200
    visible_user_ids = {item['id'] for item in response.data['data']}
    assert outsider_non_student.id in visible_user_ids

    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='user_scope',
        effect='DENY',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[mentee_non_student.id],
        granted_by=admin,
    )

    response = client.get('/api/users/')
    assert response.status_code == 200
    visible_user_ids = {item['id'] for item in response.data['data']}
    assert mentee.id in visible_user_ids
    assert mentee_non_student.id not in visible_user_ids
    assert outsider_non_student.id in visible_user_ids


@pytest.mark.django_db
def test_user_view_detail_respects_mentee_scope_for_non_student_users(grant_permissions_to_roles):
    client = APIClient()
    department = Department.objects.create(name='用户详情范围部门', code='SCOPE_RANGE_D6')

    grant_permissions_to_roles(role_codes=['MENTOR'], permission_codes=['user.view'])

    mentor = _create_user(
        employee_id='SCOPE_USER_DETAIL_MENTOR',
        username='详情导师',
        department=department,
        role_codes=['MENTOR'],
    )
    mentee_non_student = _create_non_student_user(
        employee_id='SCOPE_USER_DETAIL_NST_1',
        username='详情名下管理员',
        department=department,
        role_code='ADMIN',
    )
    outsider_non_student = _create_non_student_user(
        employee_id='SCOPE_USER_DETAIL_NST_2',
        username='详情额外管理员',
        department=department,
        role_code='ADMIN',
    )

    mentee_non_student.mentor = mentor
    mentee_non_student.save(update_fields=['mentor'])

    client.force_authenticate(user=mentor)

    response = client.get(f'/api/users/{mentee_non_student.id}/')
    assert response.status_code == 200
    assert response.data['data']['id'] == mentee_non_student.id

    response = client.get(f'/api/users/{outsider_non_student.id}/')
    assert response.status_code == 403
    assert response.data['code'] == 'PERMISSION_DENIED'


@pytest.mark.django_db
def test_task_assign_scope_includes_mentee_with_admin_and_student_roles():
    client = APIClient()
    department = Department.objects.create(name='导师学员身份部门', code='SCOPE_RANGE_D4')

    mentor = _create_user(
        employee_id='SCOPE_MENTOR_003',
        username='导师范围3',
        department=department,
        role_codes=['MENTOR'],
    )
    mentee_with_admin_role = _create_user(
        employee_id='SCOPE_STU_ADMIN_001',
        username='学员兼管理员',
        department=department,
        role_codes=['ADMIN'],
    )
    mentee_with_admin_role.mentor = mentor
    mentee_with_admin_role.save(update_fields=['mentor'])

    client.force_authenticate(user=mentor)

    response = client.get('/api/tasks/assignable-users/')
    assert response.status_code == 200
    student_ids = {item['id'] for item in response.data['data']}
    assert mentee_with_admin_role.id in student_ids


@pytest.mark.django_db
def test_super_admin_scope_is_not_constrained_by_user_overrides(create_spot_check):
    client = APIClient()
    department = Department.objects.create(name='超管范围部门', code='SCOPE_RANGE_D3')

    super_admin = _create_superuser(
        employee_id='SCOPE_SUPER_001',
        username='范围超管',
        department=department,
    )
    mentee = _create_user(
        employee_id='SCOPE_SUPER_STU_001',
        username='超管名下学员',
        department=department,
    )
    extra_student = _create_user(
        employee_id='SCOPE_SUPER_STU_002',
        username='超管非名下学员',
        department=department,
        role_codes=['ADMIN'],
    )
    mentee.mentor = super_admin
    mentee.save(update_fields=['mentor'])

    for permission_code in ('task.assign', 'spot_check.view'):
        scope_group_key = 'task_student_scope' if permission_code == 'task.assign' else 'spot_check_student_scope'
        UserScopeGroupOverride.objects.create(
            user=super_admin,
            scope_group_key=scope_group_key,
            effect='DENY',
            scope_type='EXPLICIT_USERS',
            scope_user_ids=[extra_student.id],
            granted_by=super_admin,
        )

    create_spot_check(student=mentee, checker=super_admin, topic='超管范围记录1', score='88.00')
    create_spot_check(student=extra_student, checker=super_admin, topic='超管范围记录2', score='86.00')

    client.force_authenticate(user=super_admin)

    assignable_response = client.get('/api/tasks/assignable-users/')
    assert assignable_response.status_code == 200
    assignable_ids = {item['id'] for item in assignable_response.data['data']}
    assert mentee.id in assignable_ids
    assert extra_student.id in assignable_ids

    spot_check_response = client.get('/api/spot-checks/')
    assert spot_check_response.status_code == 200
    spot_check_student_ids = {item['student'] for item in _extract_list_items(spot_check_response)}
    assert mentee.id in spot_check_student_ids
    assert extra_student.id in spot_check_student_ids


@pytest.mark.django_db
def test_spot_check_scope_supports_view_and_create_with_explicit_allow_and_deny(create_spot_check):
    client = APIClient()
    department = Department.objects.create(name='抽查范围部门', code='SCOPE_RANGE_D2')

    mentor = _create_user(
        employee_id='SCOPE_MENTOR_002',
        username='抽查导师',
        department=department,
        role_codes=['MENTOR'],
    )
    admin = _create_user(
        employee_id='SCOPE_ADMIN_002',
        username='抽查管理员',
        department=department,
        role_codes=['ADMIN'],
    )
    mentee = _create_user(
        employee_id='SCOPE_STU_001',
        username='抽查名下学员',
        department=department,
    )
    extra_student = _create_user(
        employee_id='SCOPE_STU_002',
        username='抽查额外学员',
        department=department,
    )

    mentee.mentor = mentor
    mentee.save(update_fields=['mentor'])

    create_spot_check(student=mentee, checker=mentor, topic='默认范围可见', score='88.00')
    create_spot_check(student=extra_student, checker=mentor, topic='默认范围不可见', score='86.00')

    client.force_authenticate(user=mentor)

    response = client.get('/api/spot-checks/')
    assert response.status_code == 200
    student_ids = {item['student'] for item in _extract_list_items(response)}
    assert mentee.id in student_ids
    assert extra_student.id not in student_ids

    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='spot_check_student_scope',
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[extra_student.id],
        granted_by=admin,
    )
    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='spot_check_student_scope',
        effect='DENY',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[mentee.id],
        granted_by=admin,
    )

    response = client.get('/api/spot-checks/')
    assert response.status_code == 200
    student_ids = {item['student'] for item in _extract_list_items(response)}
    assert mentee.id not in student_ids
    assert extra_student.id in student_ids

    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='spot_check_student_scope',
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[extra_student.id],
        granted_by=admin,
    )

    create_response = client.post(
        '/api/spot-checks/',
        {
            'student': extra_student.id,
            'items': [
                {
                    'topic': '覆盖后可创建',
                    'score': '90',
                    'comment': 'ok',
                }
            ],
        },
        format='json',
    )
    assert create_response.status_code == 201

    UserScopeGroupOverride.objects.create(
        user=mentor,
        scope_group_key='spot_check_student_scope',
        effect='DENY',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[mentee.id],
        granted_by=admin,
    )

    create_response = client.post(
        '/api/spot-checks/',
        {
            'student': mentee.id,
            'items': [
                {
                    'topic': '覆盖后禁止创建',
                    'score': '91',
                    'comment': 'deny',
                }
            ],
        },
        format='json',
    )
    assert create_response.status_code == 403
    assert create_response.data['code'] == 'PERMISSION_DENIED'
