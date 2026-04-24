import pytest

from apps.authorization.models import Permission, RolePermission
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture
def roles():
    role_pairs = [
        ('STUDENT', '学员'),
        ('MENTOR', '导师'),
        ('DEPT_MANAGER', '室经理'),
        ('TEAM_MANAGER', '团队经理'),
        ('ADMIN', '管理员'),
    ]
    result = {}
    for code, name in role_pairs:
        role, _ = Role.objects.get_or_create(code=code, defaults={'name': name})
        result[code] = role
    return result


@pytest.fixture
def department():
    return Department.objects.create(name='测试部门', code='DEPT1')


@pytest.fixture
def admin_user(department, roles):
    user = User.objects.create_user(
        employee_id='ADMIN200',
        username='管理员B',
        password='password123',
        department=department,
    )
    admin_role = roles['ADMIN']
    UserRole.objects.get_or_create(user=user, role=admin_role)
    user.current_role = 'ADMIN'
    permission_ids = Permission.objects.filter(
        code__in=['user.view', 'user.create', 'user.update', 'user.role.assign'],
    ).values_list('id', flat=True)
    RolePermission.objects.bulk_create(
        [
            RolePermission(role=admin_role, permission_id=permission_id)
            for permission_id in permission_ids
        ],
        ignore_conflicts=True,
    )
    return user


@pytest.fixture
def normal_user(department, roles):
    user = User.objects.create_user(
        employee_id='USER200',
        username='普通用户B',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=roles['MENTOR'])
    user.current_role = 'MENTOR'
    return user


@pytest.fixture
def super_admin_user(department, roles):
    user = User.objects.create_user(
        employee_id='SUPER200',
        username='超级管理员B',
        password='password123',
        department=department,
        is_staff=True,
        is_superuser=True,
    )
    user.current_role = 'SUPER_ADMIN'
    return user


@pytest.mark.django_db
def test_assign_multiple_non_student_roles_rejected(api_client, admin_user, normal_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        f'/api/users/{normal_user.id}/assign-roles/',
        {'role_codes': ['DEPT_MANAGER', 'TEAM_MANAGER']},
        format='json',
    )

    assert response.status_code == 400
    assert '最多只能选择一个' in str(response.data)


@pytest.mark.django_db
def test_assign_admin_role_for_non_superuser_allowed(api_client, unwrap_response_data, admin_user, normal_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        f'/api/users/{normal_user.id}/assign-roles/',
        {'role_codes': ['ADMIN']},
        format='json',
    )

    assert response.status_code == 200
    data = unwrap_response_data(response)
    role_codes = {item['code'] for item in data['roles']}
    assert role_codes == {'ADMIN', 'STUDENT'}


@pytest.mark.django_db
def test_create_user_with_admin_role_keeps_student(api_client, unwrap_response_data, admin_user, department):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        '/api/users/',
        {
            'employee_id': 'NEW_ADMIN_001',
            'username': '新管理员用户',
            'password': 'password123',
            'department_id': department.id,
            'role_codes': ['ADMIN'],
        },
        format='json',
    )

    assert response.status_code == 201
    data = unwrap_response_data(response)
    role_codes = {item['code'] for item in data['roles']}
    assert role_codes == {'ADMIN', 'STUDENT'}


@pytest.mark.django_db
def test_create_user_with_mentor_role_keeps_student(api_client, unwrap_response_data, admin_user, department):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        '/api/users/',
        {
            'employee_id': 'NEW_MENTOR_001',
            'username': '新导师用户',
            'password': 'password123',
            'department_id': department.id,
            'role_codes': ['MENTOR'],
        },
        format='json',
    )

    assert response.status_code == 201
    data = unwrap_response_data(response)
    role_codes = {item['code'] for item in data['roles']}
    assert role_codes == {'MENTOR', 'STUDENT'}


@pytest.mark.django_db
def test_create_user_with_multiple_non_student_roles_rejected(api_client, admin_user, department):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        '/api/users/',
        {
            'employee_id': 'NEW_MULTI_ROLE_001',
            'username': '多角色用户',
            'password': 'password123',
            'department_id': department.id,
            'role_codes': ['ADMIN', 'MENTOR'],
        },
        format='json',
    )

    assert response.status_code == 400
    assert '最多只能选择一个' in str(response.data)


@pytest.mark.django_db
def test_create_user_allows_duplicate_username(api_client, unwrap_response_data, admin_user, department):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        '/api/users/',
        {
            'employee_id': 'NEW_DUP_NAME_001',
            'username': admin_user.username,
            'password': 'password123',
            'department_id': department.id,
            'role_codes': ['MENTOR'],
        },
        format='json',
    )

    assert response.status_code == 201
    data = unwrap_response_data(response)
    assert data['username'] == admin_user.username
    assert data['employee_id'] == 'NEW_DUP_NAME_001'


@pytest.mark.django_db
def test_assign_admin_and_mentor_for_non_superuser_rejected(api_client, admin_user, normal_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        f'/api/users/{normal_user.id}/assign-roles/',
        {'role_codes': ['ADMIN', 'MENTOR']},
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '最多只能选择一个' in response.data['message']


@pytest.mark.django_db
def test_assign_roles_for_superuser_rejected(api_client, admin_user, super_admin_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        f'/api/users/{super_admin_user.id}/assign-roles/',
        {'role_codes': ['MENTOR']},
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '超管账号为专有角色，不允许分配业务角色' in response.data['message']


@pytest.mark.django_db
def test_assign_admin_role_for_superuser_rejected(api_client, admin_user, super_admin_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        f'/api/users/{super_admin_user.id}/assign-roles/',
        {'role_codes': ['ADMIN']},
        format='json',
    )

    assert response.status_code == 400
    assert response.data['code'] == 'VALIDATION_ERROR'
    assert '超管账号为专有角色，不允许分配业务角色' in response.data['message']


@pytest.mark.django_db
def test_assign_team_manager_role_keeps_only_team_manager(api_client, unwrap_response_data, admin_user, normal_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        f'/api/users/{normal_user.id}/assign-roles/',
        {'role_codes': ['TEAM_MANAGER']},
        format='json',
    )

    assert response.status_code == 200

    data = unwrap_response_data(response)
    role_codes = {item['code'] for item in data['roles']}
    assert role_codes == {'TEAM_MANAGER'}

    normal_user.refresh_from_db()
    db_role_codes = set(normal_user.roles.values_list('code', flat=True))
    assert db_role_codes == {'TEAM_MANAGER'}


@pytest.mark.django_db
def test_assign_mentor_role_for_non_superuser_keeps_student(api_client, unwrap_response_data, admin_user, normal_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.post(
        f'/api/users/{normal_user.id}/assign-roles/',
        {'role_codes': ['MENTOR']},
        format='json',
    )

    assert response.status_code == 200
    data = unwrap_response_data(response)
    role_codes = {item['code'] for item in data['roles']}
    assert role_codes == {'MENTOR', 'STUDENT'}


@pytest.mark.django_db
def test_user_role_instance_delete_has_no_role_assignment_business_rule(normal_user):
    student_user_role = UserRole.objects.get(user=normal_user, role__code='STUDENT')

    student_user_role.delete()

    assert set(normal_user.roles.values_list('code', flat=True)) == {'MENTOR'}


@pytest.mark.django_db
def test_superuser_detail_exposes_dedicated_super_admin_role(api_client, unwrap_response_data, admin_user, super_admin_user):
    api_client.force_authenticate(user=admin_user)

    response = api_client.get(f'/api/users/{super_admin_user.id}/')

    assert response.status_code == 200
    data = unwrap_response_data(response)
    role_codes = {item['code'] for item in data['roles']}
    assert role_codes == {'SUPER_ADMIN'}
