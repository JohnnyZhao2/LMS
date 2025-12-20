"""
Tests for user management API endpoints.

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 3.5, 3.6
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department


@pytest.fixture
def admin_user_with_role(db, department):
    """Create an admin user with ADMIN role."""
    user = User.objects.create_user(
        username='admin_test',
        password='adminpass123',
        employee_id='ADMIN001',
        username='管理员',
        department=department,
        is_active=True
    )
    # Add admin role
    admin_role, _ = Role.objects.get_or_create(
        code='ADMIN',
        defaults={'name': '管理员', 'description': '管理员角色'}
    )
    UserRole.objects.create(user=user, role=admin_role)
    return user


@pytest.fixture
def admin_client(api_client, admin_user_with_role):
    """Return an authenticated API client with admin privileges."""
    refresh = RefreshToken.for_user(admin_user_with_role)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = admin_user_with_role
    return api_client


@pytest.fixture
def mentor_user(db, department):
    """Create a mentor user."""
    user = User.objects.create_user(
        username='mentor_test',
        password='mentorpass123',
        employee_id='MENTOR001',
        username='导师',
        department=department,
        is_active=True
    )
    mentor_role, _ = Role.objects.get_or_create(
        code='MENTOR',
        defaults={'name': '导师', 'description': '导师角色'}
    )
    UserRole.objects.create(user=user, role=mentor_role)
    return user


@pytest.fixture
def dept_manager_user(db, department):
    """Create a department manager user."""
    user = User.objects.create_user(
        username='dept_manager_test',
        password='deptpass123',
        employee_id='DEPTMGR001',
        username='室经理',
        department=department,
        is_active=True
    )
    dept_role, _ = Role.objects.get_or_create(
        code='DEPT_MANAGER',
        defaults={'name': '室经理', 'description': '室经理角色'}
    )
    UserRole.objects.create(user=user, role=dept_role)
    return user


class TestUserListCreateAPI:
    """Tests for user list and create endpoints."""
    
    def test_list_users_as_admin(self, admin_client, create_user):
        """Admin can list all users."""
        # Create some users
        create_user(username='user1')
        create_user(username='user2')
        
        response = admin_client.get('/api/users/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 2
    
    def test_list_users_non_admin_fails(self, authenticated_client):
        """Non-admin cannot list users."""
        response = authenticated_client.get('/api/users/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'PERMISSION_DENIED'
    
    def test_create_user_as_admin(self, admin_client, department):
        """Admin can create new users."""
        data = {
            'username': 'newuser',
            'password': 'newpass123',
            'employee_id': 'NEW001',
            'username': '新用户',
            'email': 'new@example.com',
            'department_id': department.id
        }
        
        response = admin_client.post('/api/users/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['username'] == 'newuser'
        assert response.data['username'] == '新用户'
        
        # Verify user has student role by default
        user = User.objects.get(username='newuser')
        assert user.has_role('STUDENT')
    
    def test_create_user_non_admin_fails(self, authenticated_client, department):
        """Non-admin cannot create users."""
        data = {
            'username': 'newuser',
            'password': 'newpass123',
            'employee_id': 'NEW001',
            'username': '新用户'
        }
        
        response = authenticated_client.post('/api/users/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'PERMISSION_DENIED'


class TestUserDetailAPI:
    """Tests for user detail and update endpoints."""
    
    def test_get_user_detail(self, admin_client, create_user):
        """Admin can get user details."""
        user = create_user(username='testuser')
        
        response = admin_client.get(f'/api/users/{user.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == 'testuser'
    
    def test_update_user_info(self, admin_client, create_user, department):
        """Admin can update user information."""
        user = create_user(username='testuser')
        
        data = {
            'username': '更新后的名字',
            'email': 'updated@example.com'
        }
        
        response = admin_client.patch(f'/api/users/{user.id}/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['username'] == '更新后的名字'
        
        # Verify in database
        user.refresh_from_db()
        assert user.username == '更新后的名字'


class TestUserActivationAPI:
    """Tests for user activation/deactivation endpoints."""
    
    def test_deactivate_user(self, admin_client, create_user):
        """Admin can deactivate a user."""
        user = create_user(username='testuser', is_active=True)
        
        response = admin_client.post(f'/api/users/{user.id}/deactivate/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_active'] is False
        
        # Verify in database
        user.refresh_from_db()
        assert user.is_active is False
    
    def test_activate_user(self, admin_client, create_user):
        """Admin can activate a user."""
        user = create_user(username='testuser', is_active=False)
        
        response = admin_client.post(f'/api/users/{user.id}/activate/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['is_active'] is True
        
        # Verify in database
        user.refresh_from_db()
        assert user.is_active is True


class TestRoleAssignmentAPI:
    """Tests for role assignment endpoint."""
    
    def test_assign_roles(self, admin_client, create_user):
        """Admin can assign roles to a user."""
        user = create_user(username='testuser')
        
        data = {
            'role_codes': ['MENTOR', 'ADMIN']
        }
        
        response = admin_client.post(f'/api/users/{user.id}/assign-roles/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify roles
        user.refresh_from_db()
        role_codes = user.role_codes
        assert 'STUDENT' in role_codes  # Student role preserved
        assert 'MENTOR' in role_codes
        assert 'ADMIN' in role_codes
    
    def test_student_role_preserved(self, admin_client, create_user):
        """Student role is always preserved when assigning roles."""
        user = create_user(username='testuser')
        
        # Assign only MENTOR role (not including STUDENT)
        data = {
            'role_codes': ['MENTOR']
        }
        
        response = admin_client.post(f'/api/users/{user.id}/assign-roles/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify student role is still there
        user.refresh_from_db()
        assert user.has_role('STUDENT')


class TestMentorAssignmentAPI:
    """Tests for mentor assignment endpoint."""
    
    def test_assign_mentor(self, admin_client, create_user, mentor_user):
        """Admin can assign a mentor to a user."""
        user = create_user(username='student')
        
        data = {
            'mentor_id': mentor_user.id
        }
        
        response = admin_client.post(f'/api/users/{user.id}/assign-mentor/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify mentor assignment
        user.refresh_from_db()
        assert user.mentor_id == mentor_user.id
    
    def test_remove_mentor(self, admin_client, create_user, mentor_user):
        """Admin can remove mentor binding."""
        user = create_user(username='student')
        user.mentor = mentor_user
        user.save()
        
        data = {
            'mentor_id': None
        }
        
        response = admin_client.post(f'/api/users/{user.id}/assign-mentor/', data, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify mentor removed
        user.refresh_from_db()
        assert user.mentor is None
    
    def test_assign_non_mentor_fails(self, admin_client, create_user):
        """Cannot assign a non-mentor user as mentor."""
        user = create_user(username='student')
        non_mentor = create_user(username='non_mentor')
        
        data = {
            'mentor_id': non_mentor.id
        }
        
        response = admin_client.post(f'/api/users/{user.id}/assign-mentor/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestMenteesListAPI:
    """Tests for mentees list endpoint."""
    
    def test_mentor_can_list_mentees(self, api_client, mentor_user, create_user):
        """Mentor can list their mentees."""
        # Create mentees
        mentee1 = create_user(username='mentee1')
        mentee1.mentor = mentor_user
        mentee1.save()
        
        mentee2 = create_user(username='mentee2')
        mentee2.mentor = mentor_user
        mentee2.save()
        
        # Authenticate as mentor
        refresh = RefreshToken.for_user(mentor_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/users/mentees/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2


class TestDepartmentMembersListAPI:
    """Tests for department members list endpoint."""
    
    def test_dept_manager_can_list_members(self, api_client, dept_manager_user, create_user, department):
        """Department manager can list department members."""
        # Create members in same department
        member1 = create_user(username='member1')
        member1.department = department
        member1.save()
        
        member2 = create_user(username='member2')
        member2.department = department
        member2.save()
        
        # Authenticate as dept manager
        refresh = RefreshToken.for_user(dept_manager_user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/users/department-members/')
        
        assert response.status_code == status.HTTP_200_OK
        # Should include members but not the manager themselves
        assert len(response.data) >= 2
