import pytest
from rest_framework.test import APIClient
from typing import Optional

from apps.authorization.models import Permission, UserPermissionOverride
from apps.spot_checks.models import SpotCheck, SpotCheckItem
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


def _extract_list_items(response):
    return response.data['data']['results']


def _create_spot_check(student, checker, *, topic: str, score: str, comment: str = 'ok', content: str = '') -> SpotCheck:
    spot_check = SpotCheck.objects.create(student=student, checker=checker)
    SpotCheckItem.objects.create(
        spot_check=spot_check,
        topic=topic,
        content=content,
        score=score,
        comment=comment,
        order=0,
    )
    return spot_check


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

    task_assign_permission = Permission.objects.get(code='task.assign')
    UserPermissionOverride.objects.create(
        user=mentor,
        permission=task_assign_permission,
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

    UserPermissionOverride.objects.create(
        user=mentor,
        permission=task_assign_permission,
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
def test_super_admin_scope_is_not_constrained_by_user_overrides():
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
        permission = Permission.objects.get(code=permission_code)
        UserPermissionOverride.objects.create(
            user=super_admin,
            permission=permission,
            effect='DENY',
            scope_type='EXPLICIT_USERS',
            scope_user_ids=[extra_student.id],
            granted_by=super_admin,
        )

    _create_spot_check(student=mentee, checker=super_admin, topic='超管范围记录1', score='88.00')
    _create_spot_check(student=extra_student, checker=super_admin, topic='超管范围记录2', score='86.00')

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
def test_spot_check_scope_supports_view_and_create_with_explicit_allow_and_deny():
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

    _create_spot_check(student=mentee, checker=mentor, topic='默认范围可见', score='88.00')
    _create_spot_check(student=extra_student, checker=mentor, topic='默认范围不可见', score='86.00')

    client.force_authenticate(user=mentor)

    response = client.get('/api/spot-checks/')
    assert response.status_code == 200
    student_ids = {item['student'] for item in _extract_list_items(response)}
    assert mentee.id in student_ids
    assert extra_student.id not in student_ids

    spot_check_view_permission = Permission.objects.get(code='spot_check.view')
    UserPermissionOverride.objects.create(
        user=mentor,
        permission=spot_check_view_permission,
        effect='ALLOW',
        applies_to_role='MENTOR',
        scope_type='EXPLICIT_USERS',
        scope_user_ids=[extra_student.id],
        granted_by=admin,
    )
    UserPermissionOverride.objects.create(
        user=mentor,
        permission=spot_check_view_permission,
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

    spot_check_create_permission = Permission.objects.get(code='spot_check.create')
    UserPermissionOverride.objects.create(
        user=mentor,
        permission=spot_check_create_permission,
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

    UserPermissionOverride.objects.create(
        user=mentor,
        permission=spot_check_create_permission,
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
