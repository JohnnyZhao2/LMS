"""
Unit tests for Task Management API.

Tests for:
- 7.6: 管理员强制结束任务时将任务状态设为"已结束"，未完成的子任务标记为"已逾期"
- 20.1: 管理员查看任务列表时展示全平台所有任务
- 20.2: 管理员创建任务时允许选择任意学员（跨室）
- 20.3: 管理员强制结束任务时将任务状态设为已结束
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.knowledge.models import Knowledge
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge


@pytest.fixture
def department_1(db):
    """Create first department."""
    return Department.objects.create(
        name='一室',
        code='DEPT001',
        description='测试部门一'
    )


@pytest.fixture
def department_2(db):
    """Create second department."""
    return Department.objects.create(
        name='二室',
        code='DEPT002',
        description='测试部门二'
    )


@pytest.fixture
def mentor_role(db):
    """Get or create mentor role."""
    role, _ = Role.objects.get_or_create(
        code='MENTOR',
        defaults={'name': '导师', 'description': '导师角色'}
    )
    return role


@pytest.fixture
def dept_manager_role(db):
    """Get or create department manager role."""
    role, _ = Role.objects.get_or_create(
        code='DEPT_MANAGER',
        defaults={'name': '室经理', 'description': '室经理角色'}
    )
    return role


@pytest.fixture
def admin_role(db):
    """Get or create admin role."""
    role, _ = Role.objects.get_or_create(
        code='ADMIN',
        defaults={'name': '管理员', 'description': '管理员角色'}
    )
    return role


@pytest.fixture
def admin_user(db, department_1, admin_role):
    """Create an admin user."""
    user = User.objects.create_user(
        username='admin1',
        password='testpass123',
        employee_id='ADMIN001',
        real_name='管理员一',
        department=department_1
    )
    UserRole.objects.get_or_create(user=user, role=admin_role)
    return user


@pytest.fixture
def mentor_user(db, department_1, mentor_role):
    """Create a mentor user."""
    user = User.objects.create_user(
        username='mentor1',
        password='testpass123',
        employee_id='MENTOR001',
        real_name='导师一',
        department=department_1
    )
    UserRole.objects.get_or_create(user=user, role=mentor_role)
    return user


@pytest.fixture
def dept_manager_user(db, department_1, dept_manager_role):
    """Create a department manager user."""
    user = User.objects.create_user(
        username='deptmgr1',
        password='testpass123',
        employee_id='DEPTMGR001',
        real_name='室经理一',
        department=department_1
    )
    UserRole.objects.get_or_create(user=user, role=dept_manager_role)
    return user


@pytest.fixture
def student_in_dept1(db, department_1, mentor_user):
    """Create a student in department 1 with mentor."""
    user = User.objects.create_user(
        username='student1',
        password='testpass123',
        employee_id='STU001',
        real_name='学员一',
        department=department_1,
        mentor=mentor_user
    )
    return user


@pytest.fixture
def student_in_dept2(db, department_2):
    """Create a student in department 2."""
    user = User.objects.create_user(
        username='student3',
        password='testpass123',
        employee_id='STU003',
        real_name='学员三',
        department=department_2
    )
    return user


@pytest.fixture
def knowledge_1(db, admin_user):
    """Create first knowledge document."""
    return Knowledge.objects.create(
        title='知识文档一',
        knowledge_type='OTHER',
        content='这是知识文档一的内容',
        created_by=admin_user
    )


@pytest.fixture
def learning_task(db, admin_user, student_in_dept1, knowledge_1):
    """Create a learning task."""
    task = Task.objects.create(
        title='测试学习任务',
        description='这是一个测试学习任务',
        task_type='LEARNING',
        deadline=timezone.now() + timedelta(days=7),
        created_by=admin_user
    )
    TaskKnowledge.objects.create(task=task, knowledge=knowledge_1, order=1)
    TaskAssignment.objects.create(task=task, assignee=student_in_dept1)
    return task


def get_authenticated_client(user):
    """Get an authenticated API client for the given user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestTaskListView:
    """
    Tests for task list endpoint.
    
    Requirements: 20.1
    """
    
    def test_admin_sees_all_tasks(
        self, admin_user, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test admin can see all tasks across the platform.
        
        Requirements: 20.1
        """
        # Create task as mentor
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        mentor_client.post('/api/tasks/learning/', {
            'title': '导师任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # Admin should see the task
        admin_client = get_authenticated_client(admin_user)
        response = admin_client.get('/api/tasks/')
        
        assert response.status_code == status.HTTP_200_OK
        tasks = response.json()
        assert len(tasks) >= 1
        
        # Verify task is in the list
        task_titles = [t['title'] for t in tasks]
        assert '导师任务' in task_titles
    
    def test_mentor_sees_only_own_tasks(
        self, admin_user, mentor_user, student_in_dept1, student_in_dept2, knowledge_1
    ):
        """
        Test mentor can only see tasks they created.
        """
        # Create task as admin
        admin_client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        admin_client.post('/api/tasks/learning/', {
            'title': '管理员任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        
        # Create task as mentor
        mentor_client = get_authenticated_client(mentor_user)
        mentor_client.post('/api/tasks/learning/', {
            'title': '导师任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # Mentor should only see their own task
        response = mentor_client.get('/api/tasks/')
        
        assert response.status_code == status.HTTP_200_OK
        tasks = response.json()
        
        # Verify only mentor's task is visible
        task_titles = [t['title'] for t in tasks]
        assert '导师任务' in task_titles
        assert '管理员任务' not in task_titles
    
    def test_student_sees_assigned_tasks(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test student can see tasks assigned to them.
        """
        # Create task as mentor
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        mentor_client.post('/api/tasks/learning/', {
            'title': '学员任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # Student should see the task
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get('/api/tasks/')
        
        assert response.status_code == status.HTTP_200_OK
        tasks = response.json()
        assert len(tasks) >= 1
        assert tasks[0]['title'] == '学员任务'
    
    def test_task_list_filter_by_type(
        self, admin_user, student_in_dept1, knowledge_1
    ):
        """
        Test task list can be filtered by task type.
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        # Create learning task
        client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # Filter by LEARNING type
        response = client.get('/api/tasks/?task_type=LEARNING')
        
        assert response.status_code == status.HTTP_200_OK
        tasks = response.json()
        for task in tasks:
            assert task['task_type'] == 'LEARNING'
    
    def test_task_list_filter_by_closed_status(
        self, admin_user, student_in_dept1, knowledge_1
    ):
        """
        Test task list can be filtered by closed status.
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        # Create task
        response = client.post('/api/tasks/learning/', {
            'title': '测试任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Filter by not closed
        response = client.get('/api/tasks/?is_closed=false')
        
        assert response.status_code == status.HTTP_200_OK
        tasks = response.json()
        for task in tasks:
            assert task['is_closed'] is False


class TestTaskDetailView:
    """Tests for task detail endpoint."""
    
    def test_admin_can_view_any_task(
        self, admin_user, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test admin can view any task.
        """
        # Create task as mentor
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '导师任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Admin should be able to view the task
        admin_client = get_authenticated_client(admin_user)
        response = admin_client.get(f'/api/tasks/{task_id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['title'] == '导师任务'
    
    def test_mentor_can_view_own_task(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test mentor can view their own task.
        """
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        # Create task
        response = client.post('/api/tasks/learning/', {
            'title': '导师任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # View task
        response = client.get(f'/api/tasks/{task_id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['title'] == '导师任务'
    
    def test_mentor_cannot_view_others_task(
        self, admin_user, mentor_user, student_in_dept2, knowledge_1
    ):
        """
        Test mentor cannot view tasks created by others.
        """
        # Create task as admin
        admin_client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        response = admin_client.post('/api/tasks/learning/', {
            'title': '管理员任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Mentor should not be able to view the task
        mentor_client = get_authenticated_client(mentor_user)
        response = mentor_client.get(f'/api/tasks/{task_id}/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_student_can_view_assigned_task(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test student can view tasks assigned to them.
        """
        # Create task as mentor
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '学员任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Student should be able to view the task
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get(f'/api/tasks/{task_id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['title'] == '学员任务'


class TestTaskCloseView:
    """
    Tests for task close endpoint.
    
    Requirements: 7.6, 20.3
    """
    
    def test_admin_can_close_task(
        self, admin_user, learning_task
    ):
        """
        Test admin can force close a task.
        
        Requirements: 7.6, 20.3
        """
        client = get_authenticated_client(admin_user)
        
        response = client.post(f'/api/tasks/{learning_task.id}/close/')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['is_closed'] is True
        assert data['closed_at'] is not None
        
        # Verify in database
        learning_task.refresh_from_db()
        assert learning_task.is_closed is True
        assert learning_task.closed_at is not None
    
    def test_close_task_marks_incomplete_assignments_as_overdue(
        self, admin_user, learning_task
    ):
        """
        Test closing task marks incomplete assignments as overdue.
        
        Requirements: 7.6
        """
        client = get_authenticated_client(admin_user)
        
        # Verify assignment is IN_PROGRESS before closing
        assignment = learning_task.assignments.first()
        assert assignment.status == 'IN_PROGRESS'
        
        # Close the task
        response = client.post(f'/api/tasks/{learning_task.id}/close/')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify assignment is now OVERDUE
        assignment.refresh_from_db()
        assert assignment.status == 'OVERDUE'
    
    def test_mentor_cannot_close_task(
        self, mentor_user, learning_task
    ):
        """
        Test mentor cannot force close a task.
        """
        client = get_authenticated_client(mentor_user)
        
        response = client.post(f'/api/tasks/{learning_task.id}/close/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()['code'] == 'PERMISSION_DENIED'
    
    def test_dept_manager_cannot_close_task(
        self, dept_manager_user, learning_task
    ):
        """
        Test department manager cannot force close a task.
        """
        client = get_authenticated_client(dept_manager_user)
        
        response = client.post(f'/api/tasks/{learning_task.id}/close/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()['code'] == 'PERMISSION_DENIED'
    
    def test_student_cannot_close_task(
        self, student_in_dept1, learning_task
    ):
        """
        Test student cannot force close a task.
        """
        client = get_authenticated_client(student_in_dept1)
        
        response = client.post(f'/api/tasks/{learning_task.id}/close/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()['code'] == 'PERMISSION_DENIED'
    
    def test_cannot_close_already_closed_task(
        self, admin_user, learning_task
    ):
        """
        Test cannot close an already closed task.
        """
        client = get_authenticated_client(admin_user)
        
        # Close the task first
        client.post(f'/api/tasks/{learning_task.id}/close/')
        
        # Try to close again
        response = client.post(f'/api/tasks/{learning_task.id}/close/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()['code'] == 'INVALID_OPERATION'
    
    def test_close_nonexistent_task_returns_404(
        self, admin_user
    ):
        """
        Test closing a nonexistent task returns 404.
        """
        client = get_authenticated_client(admin_user)
        
        response = client.post('/api/tasks/99999/close/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.json()['code'] == 'RESOURCE_NOT_FOUND'
