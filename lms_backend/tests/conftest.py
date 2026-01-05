"""
Pytest 配置和 fixtures
"""
import pytest
from apps.users.models import User, Role, Department


@pytest.fixture
def test_department(db):
    """测试部门"""
    dept, _ = Department.objects.get_or_create(
        code='TEST',
        defaults={'name': '测试部门'}
    )
    return dept


@pytest.fixture
def admin_role(db):
    """管理员角色"""
    role, _ = Role.objects.get_or_create(
        code='ADMIN',
        defaults={
            'name': '管理员',
            'description': '系统管理员'
        }
    )
    return role


@pytest.fixture
def student_role(db):
    """学员角色"""
    role, _ = Role.objects.get_or_create(
        code='STUDENT',
        defaults={
            'name': '学员',
            'description': '普通学员'
        }
    )
    return role


@pytest.fixture
def mentor_role(db):
    """导师角色"""
    role, _ = Role.objects.get_or_create(
        code='MENTOR',
        defaults={
            'name': '导师',
            'description': '学员导师'
        }
    )
    return role


@pytest.fixture
def admin_user(db, test_department, admin_role):
    """管理员用户"""
    user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'employee_id': 'EMP001',
            'department': test_department,
            'is_staff': True,
            'is_superuser': True,
        }
    )
    if created:
        user.set_password('admin123')
        user.save()
    user.roles.add(admin_role)
    return user


@pytest.fixture
def student_user(db, test_department, student_role):
    """学员用户"""
    user, created = User.objects.get_or_create(
        username='student',
        defaults={
            'employee_id': 'EMP002',
            'department': test_department,
        }
    )
    if created:
        user.set_password('student123')
        user.save()
    user.roles.add(student_role)
    return user


@pytest.fixture
def mentor_user(db, test_department, mentor_role):
    """导师用户"""
    user, created = User.objects.get_or_create(
        username='mentor',
        defaults={
            'employee_id': 'EMP003',
            'department': test_department,
        }
    )
    if created:
        user.set_password('mentor123')
        user.save()
    user.roles.add(mentor_role)
    return user


@pytest.fixture
def api_client():
    """API 客户端"""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, admin_user):
    """认证的 API 客户端（管理员）"""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def student_client(api_client, student_user):
    """认证的 API 客户端（学员）"""
    api_client.force_authenticate(user=student_user)
    return api_client


@pytest.fixture
def mentor_client(api_client, mentor_user):
    """认证的 API 客户端（导师）"""
    api_client.force_authenticate(user=mentor_user)
    return api_client
