"""
Integration tests for permission and data scope control.

Tests the end-to-end flow:
1. Different roles have different data access scopes
2. Mentor sees only mentees' data
3. Department manager sees only department data
4. Admin sees all data
5. Team manager has read-only access

Requirements: 22.1-22.5, 21.3
Properties: 37-41
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.tasks.models import Task, TaskAssignment
from apps.knowledge.models import Knowledge


@pytest.fixture
def setup_permission_flow(db):
    """Set up environment for permission tests."""
    dept1 = Department.objects.create(name='一室', code='DEPT001')
    dept2 = Department.objects.create(name='二室', code='DEPT002')
    
    # Create roles
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    dept_mgr_role, _ = Role.objects.get_or_create(code='DEPT_MANAGER', defaults={'name': '室经理'})
    team_mgr_role, _ = Role.objects.get_or_create(code='TEAM_MANAGER', defaults={'name': '团队经理'})
    
    # Create admin
    admin = User.objects.create_user(
        username='管理员', password='admin123', employee_id='ADMIN001',
        department=dept1
    )
    UserRole.objects.create(user=admin, role=admin_role)
    
    # Create mentor in dept1
    mentor1 = User.objects.create_user(
        username='导师一', password='mentor123', employee_id='MENTOR001',
        department=dept1
    )
    UserRole.objects.create(user=mentor1, role=mentor_role)
    
    # Create dept manager in dept1
    dept_mgr1 = User.objects.create_user(
        username='室经理一', password='deptmgr123', employee_id='DEPTMGR001',
        department=dept1
    )
    UserRole.objects.create(user=dept_mgr1, role=dept_mgr_role)
    
    # Create team manager
    team_mgr = User.objects.create_user(
        username='团队经理', password='teammgr123', employee_id='TEAMMGR001',
        department=dept1
    )
    UserRole.objects.create(user=team_mgr, role=team_mgr_role)
    
    # Create students
    student1_dept1 = User.objects.create_user(
        username='学员一', password='student123', employee_id='STU001',
        department=dept1, mentor=mentor1
    )
    
    student2_dept1 = User.objects.create_user(
        username='学员二', password='student123', employee_id='STU002',
        department=dept1  # No mentor
    )
    
    student3_dept2 = User.objects.create_user(
        username='学员三', password='student123', employee_id='STU003',
        department=dept2
    )
    
    return {
        'dept1': dept1,
        'dept2': dept2,
        'admin': admin,
        'mentor1': mentor1,
        'dept_mgr1': dept_mgr1,
        'team_mgr': team_mgr,
        'student1_dept1': student1_dept1,
        'student2_dept1': student2_dept1,
        'student3_dept2': student3_dept2,
    }


def get_client(user):
    """Get authenticated API client for user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestMentorDataScope:
    """
    Tests for mentor data scope.
    
    Property 37: 导师数据范围限制
    Requirements: 22.1
    """
    
    def test_mentor_sees_only_mentees(self, setup_permission_flow):
        """Test mentor can only see their mentees."""
        data = setup_permission_flow
        mentor_client = get_client(data['mentor1'])
        
        # Get mentees list
        response = mentor_client.get('/api/users/mentees/')
        assert response.status_code == status.HTTP_200_OK
        
        mentees = response.json()
        mentee_ids = [m['id'] for m in mentees]
        
        # Should only include student1 (mentor's mentee)
        assert data['student1_dept1'].id in mentee_ids
        assert data['student2_dept1'].id not in mentee_ids
        assert data['student3_dept2'].id not in mentee_ids
    
    def test_mentor_task_creation_limited_to_mentees(self, setup_permission_flow):
        """Test mentor can only create tasks for mentees."""
        data = setup_permission_flow
        admin_client = get_client(data['admin'])
        mentor_client = get_client(data['mentor1'])
        
        # Create knowledge
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        deadline = timezone.now() + timedelta(days=7)
        
        # Mentor creates task for mentee - should succeed
        task_resp = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student1_dept1'].id]
        }, format='json')
        assert task_resp.status_code == status.HTTP_201_CREATED
        
        # Mentor creates task for non-mentee - should fail
        task_resp = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student2_dept1'].id]
        }, format='json')
        assert task_resp.status_code == status.HTTP_400_BAD_REQUEST


class TestDeptManagerDataScope:
    """
    Tests for department manager data scope.
    
    Property 38: 室经理数据范围限制
    Requirements: 22.2
    """
    
    def test_dept_manager_sees_only_department_members(self, setup_permission_flow):
        """Test department manager can only see department members."""
        data = setup_permission_flow
        dept_mgr_client = get_client(data['dept_mgr1'])
        
        # Get department members
        response = dept_mgr_client.get('/api/users/department-members/')
        assert response.status_code == status.HTTP_200_OK
        
        members = response.json()
        member_ids = [m['id'] for m in members]
        
        # Should include dept1 members
        assert data['student1_dept1'].id in member_ids
        assert data['student2_dept1'].id in member_ids
        # Should not include dept2 members
        assert data['student3_dept2'].id not in member_ids
    
    def test_dept_manager_task_creation_limited_to_department(self, setup_permission_flow):
        """Test department manager can only create tasks for department members."""
        data = setup_permission_flow
        admin_client = get_client(data['admin'])
        dept_mgr_client = get_client(data['dept_mgr1'])
        
        # Create knowledge
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        deadline = timezone.now() + timedelta(days=7)
        
        # Dept manager creates task for dept members - should succeed
        task_resp = dept_mgr_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student1_dept1'].id, data['student2_dept1'].id]
        }, format='json')
        assert task_resp.status_code == status.HTTP_201_CREATED
        
        # Dept manager creates task for other dept - should fail
        task_resp = dept_mgr_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student3_dept2'].id]
        }, format='json')
        assert task_resp.status_code == status.HTTP_400_BAD_REQUEST


class TestAdminDataScope:
    """
    Tests for admin data scope.
    
    Property 39: 管理员全平台数据访问
    Requirements: 22.3, 20.1
    """
    
    def test_admin_sees_all_users(self, setup_permission_flow):
        """Test admin can see all users."""
        data = setup_permission_flow
        admin_client = get_client(data['admin'])
        
        response = admin_client.get('/api/users/')
        assert response.status_code == status.HTTP_200_OK
        
        users = response.json()
        user_ids = [u['id'] for u in users]
        
        # Should include all users
        assert data['student1_dept1'].id in user_ids
        assert data['student2_dept1'].id in user_ids
        assert data['student3_dept2'].id in user_ids
    
    def test_admin_can_create_cross_department_tasks(self, setup_permission_flow):
        """Test admin can create tasks for any user."""
        data = setup_permission_flow
        admin_client = get_client(data['admin'])
        
        # Create knowledge
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        deadline = timezone.now() + timedelta(days=7)
        
        # Admin creates task for users from different departments
        task_resp = admin_client.post('/api/tasks/learning/', {
            'title': '跨部门学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [
                data['student1_dept1'].id,
                data['student3_dept2'].id
            ]
        }, format='json')
        assert task_resp.status_code == status.HTTP_201_CREATED
        assert len(task_resp.json()['assignments']) == 2


class TestTeamManagerReadOnly:
    """
    Tests for team manager read-only access.
    
    Property 41: 团队经理只读访问
    Requirements: 21.3
    """
    
    def test_team_manager_can_view_analytics(self, setup_permission_flow):
        """Test team manager can view analytics."""
        data = setup_permission_flow
        team_mgr_client = get_client(data['team_mgr'])
        
        # View team overview - should succeed
        response = team_mgr_client.get('/api/analytics/team-overview/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_team_manager_cannot_create_resources(self, setup_permission_flow):
        """Test team manager cannot create resources."""
        data = setup_permission_flow
        team_mgr_client = get_client(data['team_mgr'])
        
        # Try to create knowledge - should fail
        # The API returns 400 with PERMISSION_DENIED code (BusinessError)
        response = team_mgr_client.post('/api/knowledge/', {
            'title': '测试',
            'knowledge_type': 'OTHER',
            'content': '内容',
        }, format='json')
        # Accept either 403 or 400 with PERMISSION_DENIED
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            assert response.json()['code'] == 'PERMISSION_DENIED'
    
    def test_team_manager_cannot_create_tasks(self, setup_permission_flow):
        """Test team manager cannot create tasks."""
        data = setup_permission_flow
        admin_client = get_client(data['admin'])
        team_mgr_client = get_client(data['team_mgr'])
        
        # Create knowledge as admin
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        deadline = timezone.now() + timedelta(days=7)
        
        # Team manager tries to create task - should fail
        response = team_mgr_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student1_dept1'].id]
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestUnauthorizedAccess:
    """
    Tests for unauthorized access.
    
    Property 40: 无权限请求拒绝
    Requirements: 22.5
    """
    
    def test_unauthenticated_request_rejected(self, setup_permission_flow):
        """Test unauthenticated requests are rejected."""
        client = APIClient()
        
        response = client.get('/api/users/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_student_cannot_access_admin_endpoints(self, setup_permission_flow):
        """Test student cannot access admin endpoints."""
        data = setup_permission_flow
        student_client = get_client(data['student1_dept1'])
        
        # Try to access user management - should fail
        # The API returns 400 with PERMISSION_DENIED code (BusinessError)
        response = student_client.get('/api/users/')
        # Accept either 403 or 400 with PERMISSION_DENIED
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            assert response.json()['code'] == 'PERMISSION_DENIED'
    
    def test_student_cannot_create_tasks(self, setup_permission_flow):
        """Test student cannot create tasks."""
        data = setup_permission_flow
        admin_client = get_client(data['admin'])
        student_client = get_client(data['student1_dept1'])
        
        # Create knowledge as admin
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        deadline = timezone.now() + timedelta(days=7)
        
        # Student tries to create task - should fail
        response = student_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student2_dept1'].id]
        }, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN
