"""
Unit tests for Learning Task API.

Tests for:
- 7.1: 创建学习任务时要求选择知识文档（可多选）和目标学员
- 7.2: 导师创建学习任务时仅允许选择其名下学员
- 7.3: 室经理创建学习任务时仅允许选择本室学员
- 7.4: 管理员创建学习任务时允许选择任意学员
- 7.5: 学习任务创建成功后为每个学员创建任务分配记录

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


def get_authenticated_client(user):
    """Get an authenticated API client for the given user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestLearningTaskCreateAsAdmin:
    """Tests for admin creating learning tasks."""
    
    def test_admin_can_create_learning_task(
        self, admin_user, student_in_dept1, student_in_dept2, knowledge_1, knowledge_2
    ):
        """
        Test admin can create learning task with any students.
        
        Requirements: 7.1, 7.4, 7.5
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '学习任务测试',
            'description': '这是一个测试学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id, knowledge_2.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        # Verify task created
        assert data['title'] == '学习任务测试'
        assert data['task_type'] == 'LEARNING'
        
        # Verify knowledge items (Property 19)
        assert len(data['knowledge_items']) == 2
        
        # Verify assignments (Property 19: 任务分配记录完整性)
        assert len(data['assignments']) == 2
        
        # Verify in database
        task = Task.objects.get(id=data['id'])
        assert task.task_knowledge.count() == 2
        assert task.assignments.count() == 2
        
        # Verify assignment status is IN_PROGRESS
        for assignment in task.assignments.all():
            assert assignment.status == 'IN_PROGRESS'
    
    def test_admin_can_assign_cross_department_students(
        self, admin_user, student_in_dept1, student_in_dept2, knowledge_1
    ):
        """
        Test admin can assign students from different departments.
        
        Requirements: 7.4
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '跨部门学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 2


class TestLearningTaskCreateAsMentor:
    """Tests for mentor creating learning tasks."""
    
    def test_mentor_can_create_task_for_mentees(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test mentor can create learning task for their mentees.
        
        Requirements: 7.2
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '导师学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 1
    
    def test_mentor_cannot_create_task_for_non_mentees(
        self, mentor_user, student_in_dept1_no_mentor, knowledge_1
    ):
        """
        Test mentor cannot create learning task for non-mentees.
        
        Requirements: 7.2
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '导师学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1_no_mentor.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'assignee_ids' in response.json().get('details', {})
    
    def test_mentor_cannot_create_task_for_other_department_students(
        self, mentor_user, student_in_dept2, knowledge_1
    ):
        """
        Test mentor cannot create learning task for students in other departments.
        
        Requirements: 7.2
        Property 17: 导师任务学员范围限制
        """
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '导师学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestLearningTaskCreateAsDeptManager:
    """Tests for department manager creating learning tasks."""
    
    def test_dept_manager_can_create_task_for_department_members(
        self, dept_manager_user, student_in_dept1, student_in_dept1_no_mentor, knowledge_1
    ):
        """
        Test department manager can create learning task for department members.
        
        Requirements: 7.3
        Property 18: 室经理任务学员范围限制
        """
        client = get_authenticated_client(dept_manager_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '室经理学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept1_no_mentor.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()['assignments']) == 2
    
    def test_dept_manager_cannot_create_task_for_other_department(
        self, dept_manager_user, student_in_dept2, knowledge_1
    ):
        """
        Test department manager cannot create learning task for other department members.
        
        Requirements: 7.3
        Property 18: 室经理任务学员范围限制
        """
        client = get_authenticated_client(dept_manager_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '室经理学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'assignee_ids' in response.json().get('details', {})


class TestLearningTaskValidation:
    """Tests for learning task validation."""
    
    def test_requires_at_least_one_knowledge(self, admin_user, student_in_dept1):
        """Test that at least one knowledge document is required."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_requires_at_least_one_assignee(self, admin_user, knowledge_1):
        """Test that at least one assignee is required."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': []
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_invalid_knowledge_id_rejected(self, admin_user, student_in_dept1):
        """Test that invalid knowledge IDs are rejected."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [99999],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_invalid_assignee_id_rejected(self, admin_user, knowledge_1):
        """Test that invalid assignee IDs are rejected."""
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [99999]
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestTaskAssignmentIntegrity:
    """
    Tests for task assignment record integrity.
    
    Property 19: 任务分配记录完整性
    """
    
    def test_assignment_count_matches_assignee_count(
        self, admin_user, student_in_dept1, student_in_dept2, knowledge_1
    ):
        """
        Test that assignment count matches the number of assignees.
        
        Property 19: 任务分配记录完整性
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id, student_in_dept2.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        assert task.assignments.count() == 2
        
        # Verify each assignee has an assignment
        assignee_ids = set(task.assignments.values_list('assignee_id', flat=True))
        assert assignee_ids == {student_in_dept1.id, student_in_dept2.id}
    
    def test_assignment_initial_status_is_in_progress(
        self, admin_user, student_in_dept1, knowledge_1
    ):
        """
        Test that assignment initial status is IN_PROGRESS for learning tasks.
        
        Requirements: 7.5
        """
        client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        
        response = client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        
        task = Task.objects.get(id=response.json()['id'])
        assignment = task.assignments.first()
        assert assignment.status == 'IN_PROGRESS'


class TestTaskListView:
    """Tests for task list endpoint."""
    
    def test_admin_sees_all_tasks(
        self, admin_user, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test admin can see all tasks."""
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
        assert len(response.json()) >= 1
    
    def test_mentor_sees_own_tasks(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test mentor can see their own tasks."""
        client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        # Create task
        client.post('/api/tasks/learning/', {
            'title': '导师任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # List tasks
        response = client.get('/api/tasks/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) >= 1
        assert response.json()[0]['title'] == '导师任务'
    
    def test_student_sees_assigned_tasks(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test student can see tasks assigned to them."""
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
        assert len(response.json()) >= 1
        assert response.json()[0]['title'] == '学员任务'



class TestStudentAssignmentListView:
    """
    Tests for student assignment list endpoint.
    
    Requirements:
    - 8.1: 学员查看学习任务详情时展示任务标题、介绍、分配人、截止时间、整体进度和知识文档列表
    - 17.1: 学员访问任务中心时展示任务列表，支持按类型和状态筛选
    - 17.2: 学员查看任务列表时展示任务标题、类型、状态、截止时间和进度
    """
    
    def test_student_can_view_assigned_tasks(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test student can view their assigned tasks."""
        # Create task as mentor
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        mentor_client.post('/api/tasks/learning/', {
            'title': '学员学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # Student views their assignments
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get('/api/tasks/my-assignments/')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        
        # Verify response structure
        assignment = data[0]
        assert 'task_id' in assignment
        assert 'task_title' in assignment
        assert 'task_type' in assignment
        assert 'status' in assignment
        assert 'deadline' in assignment
        assert 'progress' in assignment
    
    def test_student_can_filter_by_task_type(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test student can filter assignments by task type."""
        # Create learning task
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # Filter by LEARNING type
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get('/api/tasks/my-assignments/?task_type=LEARNING')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for assignment in data:
            assert assignment['task_type'] == 'LEARNING'
    
    def test_student_can_filter_by_status(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test student can filter assignments by status."""
        # Create task
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        
        # Filter by IN_PROGRESS status
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get('/api/tasks/my-assignments/?status=IN_PROGRESS')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        for assignment in data:
            assert assignment['status'] == 'IN_PROGRESS'


class TestStudentLearningTaskDetailView:
    """
    Tests for student learning task detail endpoint.
    
    Requirements:
    - 8.1: 学员查看学习任务详情时展示任务标题、介绍、分配人、截止时间、整体进度和知识文档列表
    - 8.2: 学员进入未完成的知识子任务时展示知识内容和「我已学习掌握」按钮
    - 8.4: 学员查看已完成的知识子任务时展示知识内容（只读）和完成时间
    """
    
    def test_student_can_view_learning_task_detail(
        self, mentor_user, student_in_dept1, knowledge_1, knowledge_2
    ):
        """Test student can view learning task detail with knowledge items."""
        # Create task
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务详情测试',
            'description': '这是任务描述',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id, knowledge_2.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Student views task detail
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get(f'/api/tasks/{task_id}/learning-detail/')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify response structure (Requirements 8.1)
        assert data['task_title'] == '学习任务详情测试'
        assert data['task_description'] == '这是任务描述'
        assert 'created_by_name' in data
        assert 'deadline' in data
        assert 'progress' in data
        assert 'knowledge_items' in data
        
        # Verify knowledge items
        assert len(data['knowledge_items']) == 2
        for item in data['knowledge_items']:
            assert 'knowledge_id' in item
            assert 'title' in item
            assert 'is_completed' in item
            assert item['is_completed'] is False  # Initially not completed
    
    def test_student_cannot_view_non_learning_task(
        self, admin_user, student_in_dept1
    ):
        """Test student cannot use learning detail endpoint for non-learning tasks."""
        from apps.quizzes.models import Quiz
        
        # Create a quiz first
        quiz = Quiz.objects.create(
            title='测试试卷',
            description='测试',
            created_by=admin_user
        )
        
        # Create practice task
        admin_client = get_authenticated_client(admin_user)
        deadline = timezone.now() + timedelta(days=7)
        response = admin_client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Student tries to view as learning task
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get(f'/api/tasks/{task_id}/learning-detail/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_student_cannot_view_unassigned_task(
        self, mentor_user, student_in_dept1, student_in_dept1_no_mentor, knowledge_1
    ):
        """Test student cannot view task not assigned to them."""
        # Create task for another student
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        
        # Assign mentor to student_in_dept1_no_mentor temporarily
        student_in_dept1_no_mentor.mentor = mentor_user
        student_in_dept1_no_mentor.save()
        
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '其他学员任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1_no_mentor.id]
        }, format='json')
        task_id = response.json()['id']
        
        # student_in_dept1 tries to view
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get(f'/api/tasks/{task_id}/learning-detail/')
        
        # Should return 404 (not found) or 400 (bad request) - task not assigned to this student
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST]


class TestCompleteKnowledgeLearning:
    """
    Tests for completing knowledge learning.
    
    Requirements:
    - 8.3: 学员点击「我已学习掌握」时记录完成状态和完成时间
    - 8.5: 所有知识子任务完成时将学习任务状态变为「已完成」
    
    Properties:
    - Property 20: 知识学习完成记录
    - Property 21: 学习任务自动完成
    """
    
    def test_student_can_complete_knowledge_learning(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test student can mark knowledge as learned.
        
        Requirements: 8.3
        Property 20: 知识学习完成记录
        """
        # Create task
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Student completes knowledge learning
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge_1.id
        }, format='json')
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        # Verify completion recorded (Property 20)
        assert data['is_completed'] is True
        assert data['completed_at'] is not None
    
    def test_task_auto_completes_when_all_knowledge_completed(
        self, mentor_user, student_in_dept1, knowledge_1, knowledge_2
    ):
        """
        Test task auto-completes when all knowledge items are completed.
        
        Requirements: 8.5
        Property 21: 学习任务自动完成
        """
        # Create task with multiple knowledge items
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id, knowledge_2.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        student_client = get_authenticated_client(student_in_dept1)
        
        # Complete first knowledge - task should still be in progress
        response = student_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge_1.id
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['task_completed'] is False
        
        # Complete second knowledge - task should auto-complete
        response = student_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge_2.id
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.json()['task_completed'] is True
        assert response.json()['task_status'] == 'COMPLETED'
        
        # Verify in database
        assignment = TaskAssignment.objects.get(task_id=task_id, assignee=student_in_dept1)
        assert assignment.status == 'COMPLETED'
        assert assignment.completed_at is not None
    
    def test_cannot_complete_same_knowledge_twice(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test student cannot mark same knowledge as completed twice."""
        # Create task
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        student_client = get_authenticated_client(student_in_dept1)
        
        # Complete first time
        response = student_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge_1.id
        }, format='json')
        assert response.status_code == status.HTTP_200_OK
        
        # Try to complete again
        response = student_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge_1.id
        }, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_cannot_complete_knowledge_not_in_task(
        self, mentor_user, admin_user, student_in_dept1, knowledge_1, knowledge_2
    ):
        """Test student cannot complete knowledge not in the task."""
        # Create task with only knowledge_1
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() + timedelta(days=7)
        response = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_1.id],
            'assignee_ids': [student_in_dept1.id]
        }, format='json')
        task_id = response.json()['id']
        
        # Try to complete knowledge_2 which is not in the task
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge_2.id
        }, format='json')
        
        # Should return 404 (not found) or 400 (bad request) - knowledge not in task
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST]


class TestOverdueTaskStatus:
    """
    Tests for overdue task status marking.
    
    Requirements:
    - 8.7: 任务截止时间已过且未完成时将任务状态标记为「已逾期」
    
    Property 23: 任务逾期状态标记
    """
    
    def test_overdue_task_marked_when_viewing_assignments(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """
        Test overdue tasks are marked when student views assignments.
        
        Property 23: 任务逾期状态标记
        """
        # Create task with past deadline
        mentor_client = get_authenticated_client(mentor_user)
        deadline = timezone.now() - timedelta(days=1)  # Past deadline
        
        # We need to create the task directly to bypass validation
        task = Task.objects.create(
            title='过期任务',
            task_type='LEARNING',
            deadline=deadline,
            created_by=mentor_user
        )
        TaskKnowledge.objects.create(task=task, knowledge=knowledge_1, order=1)
        TaskAssignment.objects.create(task=task, assignee=student_in_dept1, status='IN_PROGRESS')
        
        # Student views assignments - should trigger overdue check
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.get('/api/tasks/my-assignments/')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Find the overdue task
        overdue_task = next(
            (a for a in response.json() if a['task_id'] == task.id),
            None
        )
        assert overdue_task is not None
        assert overdue_task['status'] == 'OVERDUE'
    
    def test_cannot_complete_knowledge_on_overdue_task(
        self, mentor_user, student_in_dept1, knowledge_1
    ):
        """Test student cannot complete knowledge on overdue task."""
        # Create task with past deadline
        task = Task.objects.create(
            title='过期任务',
            task_type='LEARNING',
            deadline=timezone.now() - timedelta(days=1),
            created_by=mentor_user
        )
        TaskKnowledge.objects.create(task=task, knowledge=knowledge_1, order=1)
        TaskAssignment.objects.create(task=task, assignee=student_in_dept1, status='OVERDUE')
        
        # Try to complete knowledge
        student_client = get_authenticated_client(student_in_dept1)
        response = student_client.post(f'/api/tasks/{task.id}/complete-knowledge/', {
            'knowledge_id': knowledge_1.id
        }, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
