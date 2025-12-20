"""
Pytest configuration and shared fixtures for LMS tests.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import Department, Role, UserRole

User = get_user_model()


@pytest.fixture
def api_client():
    """Return an API client instance."""
    return APIClient()


@pytest.fixture
def department(db):
    """Create a default department."""
    return Department.objects.create(
        name='一室',
        code='DEPT001',
        description='测试部门'
    )


@pytest.fixture
def student_role(db):
    """Get or create the student role."""
    role, _ = Role.objects.get_or_create(
        code='STUDENT',
        defaults={'name': '学员', 'description': '系统默认角色'}
    )
    return role


@pytest.fixture
def mentor_role(db):
    """Get or create the mentor role."""
    role, _ = Role.objects.get_or_create(
        code='MENTOR',
        defaults={'name': '导师', 'description': '导师角色'}
    )
    return role


@pytest.fixture
def dept_manager_role(db):
    """Get or create the department manager role."""
    role, _ = Role.objects.get_or_create(
        code='DEPT_MANAGER',
        defaults={'name': '室经理', 'description': '室经理角色'}
    )
    return role


@pytest.fixture
def admin_role(db):
    """Get or create the admin role."""
    role, _ = Role.objects.get_or_create(
        code='ADMIN',
        defaults={'name': '管理员', 'description': '管理员角色'}
    )
    return role


@pytest.fixture
def create_user(db, department, student_role):
    """Factory fixture to create users."""
    counter = [0]
    
    def _create_user(
        username=None,
        password='testpass123',
        is_active=True,
        employee_id=None,
        **kwargs
    ):
        counter[0] += 1
        if employee_id is None:
            employee_id = f'EMP{counter[0]:06d}'
        if username is None:
            username = f'测试用户{counter[0]}'
        
        # Set default department if not provided
        if 'department' not in kwargs:
            kwargs['department'] = department
        
        # Remove fields that don't exist in the model
        kwargs.pop('email', None)
        kwargs.pop('first_name', None)
        kwargs.pop('last_name', None)
        kwargs.pop('date_joined', None)
            
        user = User.objects.create_user(
            username=username,  # username 字段存储显示名称
            password=password,
            employee_id=employee_id,
            is_active=is_active,
            **kwargs
        )
        return user
    return _create_user


@pytest.fixture
def authenticated_client(api_client, create_user):
    """Return an authenticated API client."""
    user = create_user()
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user
    return api_client


@pytest.fixture
def admin_user(db, create_user, admin_role):
    """Create an admin user with ADMIN role."""
    from apps.users.models import UserRole
    user = create_user(
        username='管理员',
        password='adminpass123',
        is_staff=True,
        is_superuser=True
    )
    # Assign admin role
    UserRole.objects.get_or_create(user=user, role=admin_role)
    return user


@pytest.fixture
def admin_client(api_client, admin_user):
    """Return an authenticated API client with admin privileges."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = admin_user
    return api_client
