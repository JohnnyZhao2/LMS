"""
Unit tests for Exam Task API.

Tests for:
- 11.1: 创建考试任务时要求选择唯一试卷、设置考试时间窗口、限时和目标学员
- 11.2: 用户设置考试规则时存储开始时间、截止时间、考试时长和及格分数
- 11.3: 导师创建考试任务时仅允许选择其名下学员
- 11.4: 室经理创建考试任务时仅允许选择本室学员
- 11.5: 管理员创建考试任务时允许选择任意学员
- 11.6: 考试任务创建成功后为每个学员创建任务分配记录，初始状态为"待考试"

Properties:
- Property 17: 导师任务学员范围限制
- Property 18: 室经理任务学员范围限制
- Property 19: 任务分配记录完整性
- Property 27: 考试任务唯一试卷
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.quizzes.models import Quiz
from apps.tasks.models import Task, TaskAssignment, TaskQuiz


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
        username='导师一',
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
        username='室经理一',
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
        username='管理员一',
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
        username='学员一',
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
        username='学员二',
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
        username='学员三',
        department=department_2
    )
    return user


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


class TestExamTaskCreateAsAdmin:
    """Tests for admin creating exam tasks."""
    
    def test_admin_can_create_exam_task(
        self, admin_user, student_in_dept1, student_in_dept2, quiz_1
    ):
        """
        Test admin can create exam task with any students.
        
        Requirements: 11.1, 11.2, 11.5, 11.6
        """
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务测试',
            'description': '这是一个测试考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        # Verify task created
        assert data['title'] == '考试任务测试'
        assert data['task_type'] == 'EXAM'
        assert data['duration'] == 60
        assert Decimal(data['pass_score']) == Decimal('60.00')
        
        # Verify single quiz (Property 27: 考试任务唯一试卷)
        assert len(data['quizzes']) == 1
        assert data['quizzes'][0]['quiz'] == quiz_1.id
        
        # Verify assignments (Property 19: 任务分配记录完整性)
        assert len(data['assignments']) == 2
        
        # Verify in database
        task = Task.objects.get(id=data['id'])
        assert task.task_quizzes.count() == 1
        assert task.assignments.count() == 2
        
        # Verify assignment status is PENDING_EXAM (Requirement 11.6)
        for assignment in task.assignments.all():
            assert assignment.status == 'PENDING_EXAM'
    
    def test_admin_can_assign_cross_department_students(
        self, admin_user, student_in_dept1, student_in_dept2, quiz_1
    ):
        """
        Test admin can assign students from different departments.
        
        Requirements: 11.5
        """
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '跨部门考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 90,
            'pass_score': '70.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 2


class TestExamTaskCreateAsMentor:
    """Tests for mentor creating exam tasks."""
    
    def test_mentor_can_create_exam_task_for_mentees(
        self, mentor_user, student_in_dept1, quiz_1
    ):
        """
        Test mentor can create exam task for their mentees.
        
        Requirements: 11.3
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '导师考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 1
    
    def test_mentor_cannot_create_exam_task_for_non_mentees(
        self, mentor_user, student_in_dept1_no_mentor, quiz_1
    ):
        """
        Test mentor cannot create exam task for non-mentees.
        
        Requirements: 11.3
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '导师考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1_no_mentor.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'assignee_ids' in response.json().get('details', {})
    
    def test_mentor_cannot_create_exam_task_for_other_department_students(
        self, mentor_user, student_in_dept2, quiz_1
    ):
        """
        Test mentor cannot create exam task for students in other departments.
        
        Requirements: 11.3
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '导师考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestExamTaskCreateAsDeptManager:
    """Tests for department manager creating exam tasks."""
    
    def test_dept_manager_can_create_exam_task_for_department_members(
        self, dept_manager_user, student_in_dept1, student_in_dept1_no_mentor, quiz_1
    ):
        """
        Test department manager can create exam task for department members.
        
        Requirements: 11.4
        Property 18: 室经理任务学员范围限制
        """
        client = get_authenticated_client(dept_manager_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '室经理考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id, student_in_dept1_no_mentor.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 2
    
    def test_dept_manager_cannot_create_exam_task_for_other_department(
        self, dept_manager_user, student_in_dept2, quiz_1
    ):
        """
        Test department manager cannot create exam task for other department members.
        
        Requirements: 11.4
        Property 18: 室经理任务学员范围限制
        """
        client = get_authenticated_client(dept_manager_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '室经理考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'assignee_ids' in response.json().get('details', {})


class TestExamTaskValidation:
    """Tests for exam task validation."""
    
    def test_requires_quiz_id(self, admin_user, student_in_dept1):
        """Test that quiz_id is required."""
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_requires_start_time(self, admin_user, student_in_dept1, quiz_1):
        """Test that start_time is required."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_requires_duration(self, admin_user, student_in_dept1, quiz_1):
        """Test that duration is required."""
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_requires_pass_score(self, admin_user, student_in_dept1, quiz_1):
        """Test that pass_score is required."""
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_requires_at_least_one_assignee(self, admin_user, quiz_1):
        """Test that at least one assignee is required."""
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': []
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_start_time_must_be_before_deadline(self, admin_user, student_in_dept1, quiz_1):
        """
        Test that start_time must be before deadline.
        
        Requirements: 11.2
        """
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=7)
        deadline = timezone.now() + timedelta(days=1)  # deadline before start_time
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'start_time' in response.json().get('details', {})
    
    def test_invalid_quiz_id_rejected(self, admin_user, student_in_dept1):
        """Test that invalid quiz ID is rejected."""
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': 99999,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_invalid_assignee_id_rejected(self, admin_user, quiz_1):
        """Test that invalid assignee IDs are rejected."""
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [99999]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_duration_must_be_positive(self, admin_user, student_in_dept1, quiz_1):
        """Test that duration must be positive."""
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 0,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestExamTaskUniqueQuiz:
    """
    Tests for exam task unique quiz constraint.
    
    Property 27: 考试任务唯一试卷
    """
    
    def test_exam_task_has_exactly_one_quiz(
        self, admin_user, student_in_dept1, quiz_1
    ):
        """
        Test that exam task has exactly one quiz.
        
        Property 27: 考试任务唯一试卷
        """
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        assert task.task_quizzes.count() == 1
        assert task.quiz_count == 1


class TestExamTaskAssignmentIntegrity:
    """
    Tests for exam task assignment record integrity.
    
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
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        assert task.assignments.count() == 2
        
        # Verify each assignee has an assignment
        assignee_ids = set(task.assignments.values_list('assignee_id', flat=True))
        assert assignee_ids == {student_in_dept1.id, student_in_dept2.id}
    
    def test_assignment_initial_status_is_pending_exam(
        self, admin_user, student_in_dept1, quiz_1
    ):
        """
        Test that assignment initial status is PENDING_EXAM for exam tasks.
        
        Requirements: 11.6
        """
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,
            'pass_score': '60.00',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        assignment = task.assignments.first()
        assert assignment.status == 'PENDING_EXAM'


class TestExamTaskExamRules:
    """
    Tests for exam task rules storage.
    
    Requirements: 11.2
    """
    
    def test_exam_rules_are_stored_correctly(
        self, admin_user, student_in_dept1, quiz_1
    ):
        """
        Test that exam rules (start_time, deadline, duration, pass_score) are stored correctly.
        
        Requirements: 11.2
        """
        client = get_authenticated_client(admin_user)
        start_time = timezone.now() + timedelta(days=1)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/exam/', {
            'title': '考试任务',
            'description': '考试描述',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 120,
            'pass_score': '75.50',
            'quiz_id': quiz_1.id,
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        
        # Verify exam rules are stored
        assert task.duration == 120
        assert task.pass_score == Decimal('75.50')
        assert task.start_time is not None
        assert task.deadline is not None
        assert task.start_time < task.deadline
