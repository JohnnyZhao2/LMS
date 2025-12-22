"""
Tests for /api/tasks/assignable-users/ endpoint.
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department


@pytest.fixture
def department(db):
    return Department.objects.create(
        name='自动化一室',
        code='AUTO-DEPT-1',
        description='用于可分配学员接口测试'
    )


@pytest.fixture
def admin_user(db, department):
    user = User.objects.create_user(
        employee_id='ADM900',
        username='管理员900',
        password='testpass123',
        department=department
    )
    admin_role, _ = Role.objects.get_or_create(
        code='ADMIN',
        defaults={'name': '管理员'}
    )
    UserRole.objects.get_or_create(user=user, role=admin_role)
    return user


@pytest.fixture
def mentor_user(db, department):
    user = User.objects.create_user(
        employee_id='MEN900',
        username='导师900',
        password='testpass123',
        department=department
    )
    mentor_role, _ = Role.objects.get_or_create(
        code='MENTOR',
        defaults={'name': '导师'}
    )
    UserRole.objects.get_or_create(user=user, role=mentor_role)
    return user


@pytest.fixture
def other_department(db):
    return Department.objects.create(
        name='自动化二室',
        code='AUTO-DEPT-2',
        description='第二个部门'
    )


@pytest.fixture
def student_a(db, department, mentor_user):
    return User.objects.create_user(
        employee_id='STU900',
        username='学员900',
        password='testpass123',
        department=department,
        mentor=mentor_user
    )


@pytest.fixture
def student_b(db, other_department):
    return User.objects.create_user(
        employee_id='STU901',
        username='学员901',
        password='testpass123',
        department=other_department
    )


@pytest.fixture
def student_user(db, department):
    return User.objects.create_user(
        employee_id='STU999',
        username='学员999',
        password='testpass123',
        department=department
    )


def get_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestAssignableUsersApi:
    """Tests for assignable users endpoint."""
    
    def test_admin_receives_all_students(self, admin_user, student_a, student_b):
        client = get_client(admin_user)
        
        response = client.get('/api/tasks/assignable-users/')
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        student_ids = {item['id'] for item in payload}
        assert student_a.id in student_ids
        assert student_b.id in student_ids
    
    def test_mentor_sees_only_mentees(self, mentor_user, student_a, student_b):
        client = get_client(mentor_user)
        
        response = client.get('/api/tasks/assignable-users/')
        
        assert response.status_code == status.HTTP_200_OK
        payload = response.json()
        student_ids = {item['id'] for item in payload}
        assert student_a.id in student_ids
        assert student_b.id not in student_ids
    
    def test_student_is_forbidden(self, student_user):
        client = get_client(student_user)
        
        response = client.get('/api/tasks/assignable-users/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN

