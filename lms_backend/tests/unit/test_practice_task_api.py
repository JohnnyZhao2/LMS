"""
Unit tests for Practice Task API.

Tests for:
- 9.1: 创建练习任务时要求选择试卷（可多选）、可选关联知识文档和目标学员
- 9.2: 导师创建练习任务时仅允许选择其名下学员
- 9.3: 室经理创建练习任务时仅允许选择本室学员
- 9.4: 管理员创建练习任务时允许选择任意学员
- 9.5: 练习任务创建成功后为每个学员创建任务分配记录，初始状态为"进行中"

Properties:
- Property 17: 导师任务学员范围限制
- Property 18: 室经理任务学员范围限制
- Property 19: 任务分配记录完整性
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz


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
def student_in_dept1_no_mentor(db, department_1):
    """Create a student in department 1 without mentor."""
    user = User.objects.create_user(
        username='student2',
        password='testpass123',
        employee_id='STU002',
        real_name='学员二',
        department=department_1
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
def knowledge_2(db, admin_user):
    """Create second knowledge document."""
    return Knowledge.objects.create(
        title='知识文档二',
        knowledge_type='OTHER',
        content='这是知识文档二的内容',
        created_by=admin_user
    )


@pytest.fixture
def quiz_1(db, admin_user):
    """Create first quiz."""
    return Quiz.objects.create(
        title='试卷一',
        description='这是试卷一的描述',
        created_by=admin_user
    )


@pytest.fixture
def quiz_2(db, admin_user):
    """Create second quiz."""
    return Quiz.objects.create(
        title='试卷二',
        description='这是试卷二的描述',
        created_by=admin_user
    )


def get_authenticated_client(user):
    """Get an authenticated API client for the given user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestPracticeTaskCreateAsAdmin:
    """Tests for admin creating practice tasks."""
    
    def test_admin_can_create_practice_task(
        self, admin_user, student_in_dept1, student_in_dept2, quiz_1, quiz_2
    ):
        """
        Test admin can create practice task with any students.
        
        Requirements: 9.1, 9.4, 9.5
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务测试',
            'description': '这是一个测试练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id, quiz_2.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        # Verify task created
        assert data['title'] == '练习任务测试'
        assert data['task_type'] == 'PRACTICE'
        
        # Verify quizzes
        assert len(data['quizzes']) == 2
        
        # Verify assignments (Property 19: 任务分配记录完整性)
        assert len(data['assignments']) == 2
        
        # Verify in database
        task = Task.objects.get(id=data['id'])
        assert task.task_quizzes.count() == 2
        assert task.assignments.count() == 2
        
        # Verify assignment status is IN_PROGRESS (Requirement 9.5)
        for assignment in task.assignments.all():
            assert assignment.status == 'IN_PROGRESS'
    
    def test_admin_can_create_practice_task_with_knowledge(
        self, admin_user, student_in_dept1, quiz_1, knowledge_1, knowledge_2
    ):
        """
        Test admin can create practice task with optional knowledge documents.
        
        Requirements: 9.1
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务带知识',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'knowledge_ids': [knowledge_1.id, knowledge_2.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        # Verify knowledge items
        assert len(data['knowledge_items']) == 2
        
        # Verify in database
        task = Task.objects.get(id=data['id'])
        assert task.task_knowledge.count() == 2
    
    def test_admin_can_create_practice_task_without_knowledge(
        self, admin_user, student_in_dept1, quiz_1
    ):
        """
        Test admin can create practice task without knowledge documents.
        
        Requirements: 9.1 (knowledge is optional)
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务无知识',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        # Verify no knowledge items
        assert len(data['knowledge_items']) == 0
    
    def test_admin_can_assign_cross_department_students(
        self, admin_user, student_in_dept1, student_in_dept2, quiz_1
    ):
        """
        Test admin can assign students from different departments.
        
        Requirements: 9.4
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '跨部门练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 2


class TestPracticeTaskCreateAsMentor:
    """Tests for mentor creating practice tasks."""
    
    def test_mentor_can_create_task_for_mentees(
        self, mentor_user, student_in_dept1, quiz_1
    ):
        """
        Test mentor can create practice task for their mentees.
        
        Requirements: 9.2
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '导师练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 1
    
    def test_mentor_cannot_create_task_for_non_mentees(
        self, mentor_user, student_in_dept1_no_mentor, quiz_1
    ):
        """
        Test mentor cannot create practice task for non-mentees.
        
        Requirements: 9.2
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '导师练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept1_no_mentor.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'assignee_ids' in response.json().get('details', {})
    
    def test_mentor_cannot_create_task_for_other_department_students(
        self, mentor_user, student_in_dept2, quiz_1
    ):
        """
        Test mentor cannot create practice task for students in other departments.
        
        Requirements: 9.2
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '导师练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestPracticeTaskCreateAsDeptManager:
    """Tests for department manager creating practice tasks."""
    
    def test_dept_manager_can_create_task_for_department_members(
        self, dept_manager_user, student_in_dept1, student_in_dept1_no_mentor, quiz_1
    ):
        """
        Test department manager can create practice task for department members.
        
        Requirements: 9.3
        Property 18: 室经理任务学员范围限制
        """
        client = get_authenticated_client(dept_manager_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '室经理练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept1_no_mentor.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 2
    
    def test_dept_manager_cannot_create_task_for_other_department(
        self, dept_manager_user, student_in_dept2, quiz_1
    ):
        """
        Test department manager cannot create practice task for other department members.
        
        Requirements: 9.3
        Property 18: 室经理任务学员范围限制
        """
        client = get_authenticated_client(dept_manager_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '室经理练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'assignee_ids' in response.json().get('details', {})


class TestPracticeTaskValidation:
    """Tests for practice task validation."""
    
    def test_requires_at_least_one_quiz(self, admin_user, student_in_dept1):
        """Test that at least one quiz is required."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_requires_at_least_one_assignee(self, admin_user, quiz_1):
        """Test that at least one assignee is required."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': []
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_invalid_quiz_id_rejected(self, admin_user, student_in_dept1):
        """Test that invalid quiz IDs are rejected."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [99999],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_invalid_assignee_id_rejected(self, admin_user, quiz_1):
        """Test that invalid assignee IDs are rejected."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [99999]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_invalid_knowledge_id_rejected(self, admin_user, student_in_dept1, quiz_1):
        """Test that invalid knowledge IDs are rejected."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'knowledge_ids': [99999],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestPracticeTaskAssignmentIntegrity:
    """
    Tests for practice task assignment record integrity.
    
    Property 19: 任务分配记录完整性
    """
    
    def test_assignment_count_matches_assignee_count(
        self, admin_user, student_in_dept1, student_in_dept2, quiz_1
    ):
        """
        Test that assignment count matches the number of assignees.
        
        Property 19: 任务分配记录完整性
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        assert task.assignments.count() == 2
        
        # Verify each assignee has an assignment
        assignee_ids = set(task.assignments.values_list('assignee_id', flat=True))
        assert assignee_ids == {student_in_dept1.id, student_in_dept2.id}
    
    def test_assignment_initial_status_is_in_progress(
        self, admin_user, student_in_dept1, quiz_1
    ):
        """
        Test that assignment initial status is IN_PROGRESS for practice tasks.
        
        Requirements: 9.5
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        assignment = task.assignments.first()
        assert assignment.status == 'IN_PROGRESS'
