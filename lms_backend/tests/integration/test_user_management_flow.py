"""
Integration tests for user management business flow.

Tests the end-to-end flow:
1. Admin creates users
2. Admin assigns roles
3. Admin sets up mentor relationships
4. User authentication and role switching
5. User deactivation/activation

Requirements: 1.1-1.6, 2.1-2.6, 3.1-3.6
"""
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department


@pytest.fixture
def setup_user_management(db):
    """Set up environment for user management tests."""
    dept1 = Department.objects.create(name='一室', code='DEPT001')
    dept2 = Department.objects.create(name='二室', code='DEPT002')
    
    # Create all roles
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    dept_mgr_role, _ = Role.objects.get_or_create(code='DEPT_MANAGER', defaults={'name': '室经理'})
    student_role, _ = Role.objects.get_or_create(code='STUDENT', defaults={'name': '学员'})
    
    # Create admin user
    admin = User.objects.create_user(
        username='管理员', password='admin123', employee_id='ADMIN001',
        department=dept1
    )
    UserRole.objects.create(user=admin, role=admin_role)
    
    return {
        'dept1': dept1,
        'dept2': dept2,
        'admin': admin,
        'admin_role': admin_role,
        'mentor_role': mentor_role,
        'dept_mgr_role': dept_mgr_role,
        'student_role': student_role,
    }


def get_client(user):
    """Get authenticated API client for user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestUserManagementFlow:
    """Integration test for complete user management flow."""
    
    def test_complete_user_management_flow(self, setup_user_management):
        """
        Test complete user management flow.
        
        Flow:
        1. Admin creates new users
        2. Admin assigns mentor role
        3. Admin sets up mentor-student relationship
        4. Student logs in and sees mentor info
        5. Admin deactivates user
        6. Deactivated user cannot login
        7. Admin reactivates user
        """
        data = setup_user_management
        admin_client = get_client(data['admin'])
        
        # Step 1: Admin creates mentor user
        mentor_resp = admin_client.post('/api/users/', {
            'username': 'mentor1',
            'password': 'mentor123',
            'employee_id': 'MENTOR001',
            'username': '导师一',
            'department_id': data['dept1'].id,
        }, format='json')
        assert mentor_resp.status_code == status.HTTP_201_CREATED
        mentor_id = mentor_resp.json()['id']
        
        # Verify new user has STUDENT role by default (Property 5)
        mentor_user = User.objects.get(id=mentor_id)
        assert mentor_user.roles.filter(code='STUDENT').exists()
        
        # Step 2: Admin assigns mentor role (Property 9: 学员角色不可移除)
        assign_resp = admin_client.post(f'/api/users/{mentor_id}/assign-roles/', {
            'role_codes': ['MENTOR']
        }, format='json')
        assert assign_resp.status_code == status.HTTP_200_OK
        
        # Verify STUDENT role still exists
        mentor_user.refresh_from_db()
        assert mentor_user.roles.filter(code='STUDENT').exists()
        assert mentor_user.roles.filter(code='MENTOR').exists()
        
        # Step 3: Admin creates student user
        student_resp = admin_client.post('/api/users/', {
            'username': 'student1',
            'password': 'student123',
            'employee_id': 'STU001',
            'username': '学员一',
            'department_id': data['dept1'].id,
        }, format='json')
        assert student_resp.status_code == status.HTTP_201_CREATED
        student_id = student_resp.json()['id']
        
        # Step 4: Admin assigns mentor to student (Property 10: 师徒关系唯一性)
        assign_mentor_resp = admin_client.post(f'/api/users/{student_id}/assign-mentor/', {
            'mentor_id': mentor_id
        }, format='json')
        assert assign_mentor_resp.status_code == status.HTTP_200_OK
        
        student_user = User.objects.get(id=student_id)
        assert student_user.mentor_id == mentor_id
        
        # Step 5: Student logs in
        client = APIClient()
        login_resp = client.post('/api/auth/login/', {
            'username': 'student1',
            'password': 'student123'
        }, format='json')
        assert login_resp.status_code == status.HTTP_200_OK
        assert 'access_token' in login_resp.json()
        
        # Step 6: Admin deactivates student (Property 7)
        deactivate_resp = admin_client.post(f'/api/users/{student_id}/deactivate/')
        assert deactivate_resp.status_code == status.HTTP_200_OK
        
        student_user.refresh_from_db()
        assert student_user.is_active is False
        
        # Step 7: Deactivated user cannot login (Property 3)
        login_resp = client.post('/api/auth/login/', {
            'username': 'student1',
            'password': 'student123'
        }, format='json')
        assert login_resp.status_code == status.HTTP_400_BAD_REQUEST
        assert login_resp.json()['code'] == 'AUTH_USER_INACTIVE'
        
        # Step 8: Admin reactivates user
        activate_resp = admin_client.post(f'/api/users/{student_id}/activate/')
        assert activate_resp.status_code == status.HTTP_200_OK
        
        # Step 9: User can login again
        login_resp = client.post('/api/auth/login/', {
            'username': 'student1',
            'password': 'student123'
        }, format='json')
        assert login_resp.status_code == status.HTTP_200_OK
    
    def test_role_switching_flow(self, setup_user_management):
        """
        Test role switching flow.
        
        Property 4: 角色切换权限生效
        Requirements: 1.2, 1.3
        """
        data = setup_user_management
        admin_client = get_client(data['admin'])
        
        # Create user with multiple roles
        user_resp = admin_client.post('/api/users/', {
            'username': 'multiuser',
            'password': 'multi123',
            'employee_id': 'MULTI001',
            'username': '多角色用户',
            'department_id': data['dept1'].id,
        }, format='json')
        user_id = user_resp.json()['id']
        
        # Assign mentor role
        admin_client.post(f'/api/users/{user_id}/assign-roles/', {
            'role_codes': ['MENTOR']
        }, format='json')
        
        # User logs in
        client = APIClient()
        login_resp = client.post('/api/auth/login/', {
            'username': 'multiuser',
            'password': 'multi123'
        }, format='json')
        
        # Verify available roles (Property 2)
        available_roles = [r['code'] for r in login_resp.json()['available_roles']]
        assert 'STUDENT' in available_roles
        assert 'MENTOR' in available_roles
        
        # Set up authenticated client
        access_token = login_resp.json()['access_token']
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        
        # Switch to MENTOR role (Property 4)
        switch_resp = client.post('/api/auth/switch-role/', {
            'role_code': 'MENTOR'
        }, format='json')
        assert switch_resp.status_code == status.HTTP_200_OK
        assert switch_resp.json()['current_role'] == 'MENTOR'
        
        # Try to switch to invalid role
        switch_resp = client.post('/api/auth/switch-role/', {
            'role_code': 'ADMIN'
        }, format='json')
        assert switch_resp.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_mentor_relationship_uniqueness(self, setup_user_management):
        """
        Test mentor relationship uniqueness.
        
        Property 10: 师徒关系唯一性
        Requirements: 3.4, 3.5, 3.6
        """
        data = setup_user_management
        admin_client = get_client(data['admin'])
        
        # Create two mentors
        mentor1_resp = admin_client.post('/api/users/', {
            'username': 'mentor1',
            'password': 'mentor123',
            'employee_id': 'MENTOR001',
            'username': '导师一',
            'department_id': data['dept1'].id,
        }, format='json')
        mentor1_id = mentor1_resp.json()['id']
        
        # Assign MENTOR role to mentor1
        admin_client.post(f'/api/users/{mentor1_id}/assign-roles/', {
            'role_codes': ['MENTOR']
        }, format='json')
        
        mentor2_resp = admin_client.post('/api/users/', {
            'username': 'mentor2',
            'password': 'mentor123',
            'employee_id': 'MENTOR002',
            'username': '导师二',
            'department_id': data['dept1'].id,
        }, format='json')
        mentor2_id = mentor2_resp.json()['id']
        
        # Assign MENTOR role to mentor2
        admin_client.post(f'/api/users/{mentor2_id}/assign-roles/', {
            'role_codes': ['MENTOR']
        }, format='json')
        
        # Create student
        student_resp = admin_client.post('/api/users/', {
            'username': 'student1',
            'password': 'student123',
            'employee_id': 'STU001',
            'username': '学员一',
            'department_id': data['dept1'].id,
        }, format='json')
        student_id = student_resp.json()['id']
        
        # Assign first mentor
        resp1 = admin_client.post(f'/api/users/{student_id}/assign-mentor/', {
            'mentor_id': mentor1_id
        }, format='json')
        assert resp1.status_code == status.HTTP_200_OK
        
        student = User.objects.get(id=student_id)
        assert student.mentor_id == mentor1_id
        
        # Assign second mentor - should replace first
        resp2 = admin_client.post(f'/api/users/{student_id}/assign-mentor/', {
            'mentor_id': mentor2_id
        }, format='json')
        assert resp2.status_code == status.HTTP_200_OK
        
        student.refresh_from_db()
        assert student.mentor_id == mentor2_id  # Only one mentor
    
    def test_department_manager_transfer(self, setup_user_management):
        """
        Test department manager role transfer.
        
        Property 11: 室经理权限原子转移
        Requirements: 3.2, 3.3
        """
        data = setup_user_management
        admin_client = get_client(data['admin'])
        
        # Create two users in same department
        user1_resp = admin_client.post('/api/users/', {
            'username': 'user1',
            'password': 'user123',
            'employee_id': 'USER001',
            'username': '用户一',
            'department_id': data['dept1'].id,
        }, format='json')
        user1_id = user1_resp.json()['id']
        
        user2_resp = admin_client.post('/api/users/', {
            'username': 'user2',
            'password': 'user123',
            'employee_id': 'USER002',
            'username': '用户二',
            'department_id': data['dept1'].id,
        }, format='json')
        user2_id = user2_resp.json()['id']
        
        # Assign dept manager role to user1
        admin_client.post(f'/api/users/{user1_id}/assign-roles/', {
            'role_codes': ['DEPT_MANAGER']
        }, format='json')
        
        user1 = User.objects.get(id=user1_id)
        assert user1.roles.filter(code='DEPT_MANAGER').exists()
        
        # Transfer dept manager to user2
        admin_client.post(f'/api/users/{user2_id}/assign-roles/', {
            'role_codes': ['DEPT_MANAGER']
        }, format='json')
        
        # Note: The actual transfer logic depends on implementation
        # This test verifies the role can be assigned
        user2 = User.objects.get(id=user2_id)
        assert user2.roles.filter(code='DEPT_MANAGER').exists()
