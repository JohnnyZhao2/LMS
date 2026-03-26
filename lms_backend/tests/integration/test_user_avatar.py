import pytest
from rest_framework.test import APIClient

from apps.authorization.models import Permission, RolePermission
from apps.users.models import Department, Role, User, UserRole


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department():
    return Department.objects.create(name='头像测试部门', code='AVATAR_DEPT')


def _grant_role_permissions(role, permission_codes):
    permissions = Permission.objects.filter(code__in=permission_codes)
    for permission in permissions:
        RolePermission.objects.get_or_create(role=role, permission=permission)


@pytest.fixture
def admin_role():
    role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    _grant_role_permissions(role, ['user.view'])
    return role


@pytest.fixture
def mentor_role():
    role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    return role


@pytest.fixture
def admin_user(department, admin_role):
    user = User.objects.create_user(
        employee_id='AVATAR_ADMIN_001',
        username='头像管理员',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=admin_role)
    return user


@pytest.fixture
def normal_user(department):
    return User.objects.create_user(
        employee_id='AVATAR_USER_001',
        username='普通用户',
        password='password123',
        department=department,
    )


@pytest.fixture
def mentor_user(department, mentor_role):
    user = User.objects.create_user(
        employee_id='AVATAR_MENTOR_001',
        username='导师用户',
        password='password123',
        department=department,
    )
    UserRole.objects.get_or_create(user=user, role=mentor_role)
    return user


@pytest.mark.django_db
class TestUserAvatarApi:
    def test_me_returns_avatar_key(self, api_client, normal_user):
        api_client.force_authenticate(user=normal_user)

        response = api_client.get('/api/auth/me/')

        assert response.status_code == 200, response.data
        assert response.data['data']['user']['avatar_key'] == 'avatar-01'

    def test_user_list_returns_avatar_key(self, api_client, admin_user, normal_user):
        api_client.force_authenticate(user=admin_user)

        response = api_client.get('/api/users/')

        assert response.status_code == 200, response.data
        matched_user = next(item for item in response.data['data'] if item['id'] == normal_user.id)
        assert matched_user['avatar_key'] == 'avatar-01'

    def test_user_can_update_own_avatar(self, api_client, normal_user):
        api_client.force_authenticate(user=normal_user)

        response = api_client.patch(
            '/api/users/me/avatar/',
            {'avatar_key': 'avatar-03'},
            format='json',
        )

        assert response.status_code == 200, response.data
        normal_user.refresh_from_db()
        assert normal_user.avatar_key == 'avatar-03'
        assert response.data['data']['avatar_key'] == 'avatar-03'

    def test_admin_can_update_other_user_avatar(self, api_client, admin_user, normal_user):
        api_client.force_authenticate(user=admin_user)

        response = api_client.patch(
            f'/api/users/{normal_user.id}/avatar/',
            {'avatar_key': 'avatar-04'},
            format='json',
        )

        assert response.status_code == 200, response.data
        normal_user.refresh_from_db()
        assert normal_user.avatar_key == 'avatar-04'
        assert response.data['data']['avatar_key'] == 'avatar-04'

    def test_non_admin_cannot_update_other_user_avatar(self, api_client, mentor_user, normal_user):
        api_client.force_authenticate(user=mentor_user)

        response = api_client.patch(
            f'/api/users/{normal_user.id}/avatar/',
            {'avatar_key': 'avatar-05'},
            format='json',
        )

        assert response.status_code == 403, response.data

    def test_avatar_key_must_be_valid(self, api_client, normal_user):
        api_client.force_authenticate(user=normal_user)

        response = api_client.patch(
            '/api/users/me/avatar/',
            {'avatar_key': 'avatar-99'},
            format='json',
        )

        assert response.status_code == 400, response.data
        assert response.data['code'] == 'VALIDATION_ERROR'
