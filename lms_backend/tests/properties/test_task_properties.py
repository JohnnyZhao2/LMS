"""
Property-based tests for Task creation and assignment.

Tests the following correctness properties:
- Property 17: 导师任务学员范围限制
- Property 18: 室经理任务学员范围限制
- Property 19: 任务分配记录完整性
- Property 27: 考试任务唯一试卷

**Feature: lms-backend**
**Validates: Requirements 7.2, 7.3, 9.2, 9.3, 11.1, 11.3, 11.4, 7.5, 9.5, 11.6**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz


# Suppress function-scoped fixture health check since our fixtures are
# intentionally shared across hypothesis iterations (they set up static data)
HYPOTHESIS_SETTINGS = {
    'max_examples': 100,
    'deadline': None,
    'suppress_health_check': [HealthCheck.function_scoped_fixture]
}


# ============ Fixtures ============

@pytest.fixture
def setup_roles(db):
    """Ensure all roles exist in the database."""
    roles = {}
    for code, name in Role.ROLE_CHOICES:
        role, _ = Role.objects.get_or_create(
            code=code,
            defaults={'name': name, 'description': f'{name}角色'}
        )
        roles[code] = role
    return roles


@pytest.fixture
def setup_departments(db):
    """Create test departments."""
    dept1, _ = Department.objects.get_or_create(
        code='DEPT001',
        defaults={'name': '一室', 'description': '第一室'}
    )
    dept2, _ = Department.objects.get_or_create(
        code='DEPT002',
        defaults={'name': '二室', 'description': '第二室'}
    )
    return {'dept1': dept1, 'dept2': dept2}


@pytest.fixture
def api_client():
    """Return an API client instance."""
    return APIClient()


def get_authenticated_client(user, role_code=None):
    """Create an authenticated API client for a user with optional role."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    
    # Add current_role to the token if specified
    if role_code:
        refresh['current_role'] = role_code
        user.current_role = role_code
    
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.user = user
    return client


# ============ Property Tests ============


class TestProperty17MentorTaskStudentScopeRestriction:
    """
    **Feature: lms-backend, Property 17: 导师任务学员范围限制**
    
    *For any* 导师创建的任务，分配的学员必须全部是该导师的名下学员（mentor_id = 导师 ID）。
    **Validates: Requirements 7.2, 9.2, 11.3**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_mentees=st.integers(min_value=1, max_value=3),
        num_other_students=st.integers(min_value=1, max_value=3),
        task_type=st.sampled_from(['LEARNING', 'PRACTICE', 'EXAM']),
    )
    def test_mentor_can_only_assign_tasks_to_mentees(
        self,
        setup_roles,
        setup_departments,
        num_mentees,
        num_other_students,
        task_type,
    ):
        """
        **Feature: lms-backend, Property 17: 导师任务学员范围限制**
        
        For any mentor creating a task, the assigned students must all be
        their mentees (mentor_id = mentor's ID).
        
        **Validates: Requirements 7.2, 9.2, 11.3**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            real_name='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        created_users = [mentor]
        mentee_ids = []
        other_student_ids = []
        
        try:
            # Create mentees under this mentor
            for i in range(num_mentees):
                mentee = User.objects.create_user(
                    username=f'mentee_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'MTE_{unique_suffix}_{i}',
                    real_name=f'学员{i}',
                    department=dept,
                    mentor=mentor,
                )
                created_users.append(mentee)
                mentee_ids.append(mentee.id)
            
            # Create other students (not under this mentor)
            for i in range(num_other_students):
                other = User.objects.create_user(
                    username=f'other_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'OTH_{unique_suffix}_{i}',
                    real_name=f'其他学员{i}',
                    department=dept,
                    mentor=None,
                )
                created_users.append(other)
                other_student_ids.append(other.id)
            
            # Create required resources based on task type
            if task_type == 'LEARNING':
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}',
                    knowledge_type='OTHER',
                    content='测试内容',
                    created_by=mentor,
                )
            else:
                quiz = Quiz.objects.create(
                    title=f'试卷_{unique_suffix}',
                    created_by=mentor,
                )
            
            # Get authenticated client for mentor
            client = get_authenticated_client(mentor, 'MENTOR')
            
            # Test 1: Mentor CAN create task for mentees only
            if task_type == 'LEARNING':
                data = {
                    'title': f'学习任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'knowledge_ids': [knowledge.id],
                    'assignee_ids': mentee_ids,
                }
                response = client.post('/api/tasks/learning/', data, format='json')
            elif task_type == 'PRACTICE':
                data = {
                    'title': f'练习任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'quiz_ids': [quiz.id],
                    'assignee_ids': mentee_ids,
                }
                response = client.post('/api/tasks/practice/', data, format='json')
            else:  # EXAM
                data = {
                    'title': f'考试任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'start_time': timezone.now().isoformat(),
                    'duration': 60,
                    'pass_score': 60,
                    'quiz_id': quiz.id,
                    'assignee_ids': mentee_ids,
                }
                response = client.post('/api/tasks/exam/', data, format='json')
            
            # Property assertion: mentor should be able to create task for mentees
            assert response.status_code == 201, \
                f"Mentor should be able to create {task_type} task for mentees. Got: {response.status_code}, {response.data}"
            
            # Verify all assignments are for mentees
            task_id = response.data['id']
            assignments = TaskAssignment.objects.filter(task_id=task_id)
            for assignment in assignments:
                assert assignment.assignee.mentor_id == mentor.id, \
                    f"Assignment should be for mentor's mentee, but got mentor_id={assignment.assignee.mentor_id}"
            
            # Test 2: Mentor CANNOT create task for non-mentees
            if task_type == 'LEARNING':
                data['assignee_ids'] = other_student_ids
                response = client.post('/api/tasks/learning/', data, format='json')
            elif task_type == 'PRACTICE':
                data['assignee_ids'] = other_student_ids
                response = client.post('/api/tasks/practice/', data, format='json')
            else:  # EXAM
                data['assignee_ids'] = other_student_ids
                response = client.post('/api/tasks/exam/', data, format='json')
            
            # Property assertion: mentor should NOT be able to create task for non-mentees
            assert response.status_code == 400, \
                f"Mentor should NOT be able to create {task_type} task for non-mentees. Got: {response.status_code}"
            
        finally:
            # Cleanup
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=mentor).delete()
            if task_type == 'LEARNING':
                Knowledge.objects.filter(created_by=mentor).delete()
            else:
                Quiz.objects.filter(created_by=mentor).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


class TestProperty18DeptManagerTaskStudentScopeRestriction:
    """
    **Feature: lms-backend, Property 18: 室经理任务学员范围限制**
    
    *For any* 室经理创建的任务，分配的学员必须全部是该室经理所在室的成员（department_id 相同）。
    **Validates: Requirements 7.3, 9.3, 11.4**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_dept_members=st.integers(min_value=1, max_value=3),
        num_other_dept_members=st.integers(min_value=1, max_value=3),
        task_type=st.sampled_from(['LEARNING', 'PRACTICE', 'EXAM']),
    )
    def test_dept_manager_can_only_assign_tasks_to_dept_members(
        self,
        setup_roles,
        setup_departments,
        num_dept_members,
        num_other_dept_members,
        task_type,
    ):
        """
        **Feature: lms-backend, Property 18: 室经理任务学员范围限制**
        
        For any department manager creating a task, the assigned students
        must all be members of their department (department_id matches).
        
        **Validates: Requirements 7.3, 9.3, 11.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept1 = setup_departments['dept1']
        dept2 = setup_departments['dept2']
        
        # Create department manager in dept1
        dept_manager = User.objects.create_user(
            username=f'deptmgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'DM_{unique_suffix}',
            real_name='室经理',
            department=dept1,
        )
        UserRole.objects.get_or_create(user=dept_manager, role=setup_roles['DEPT_MANAGER'])
        
        created_users = [dept_manager]
        dept1_member_ids = []
        dept2_member_ids = []
        
        try:
            # Create members in dept1 (same department as manager)
            for i in range(num_dept_members):
                member = User.objects.create_user(
                    username=f'dept1_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D1M_{unique_suffix}_{i}',
                    real_name=f'一室成员{i}',
                    department=dept1,
                )
                created_users.append(member)
                dept1_member_ids.append(member.id)
            
            # Create members in dept2 (different department)
            for i in range(num_other_dept_members):
                other = User.objects.create_user(
                    username=f'dept2_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D2M_{unique_suffix}_{i}',
                    real_name=f'二室成员{i}',
                    department=dept2,
                )
                created_users.append(other)
                dept2_member_ids.append(other.id)
            
            # Create required resources based on task type
            if task_type == 'LEARNING':
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}',
                    knowledge_type='OTHER',
                    content='测试内容',
                    created_by=dept_manager,
                )
            else:
                quiz = Quiz.objects.create(
                    title=f'试卷_{unique_suffix}',
                    created_by=dept_manager,
                )
            
            # Get authenticated client for dept manager
            client = get_authenticated_client(dept_manager, 'DEPT_MANAGER')
            
            # Test 1: Dept manager CAN create task for dept members only
            if task_type == 'LEARNING':
                data = {
                    'title': f'学习任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'knowledge_ids': [knowledge.id],
                    'assignee_ids': dept1_member_ids,
                }
                response = client.post('/api/tasks/learning/', data, format='json')
            elif task_type == 'PRACTICE':
                data = {
                    'title': f'练习任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'quiz_ids': [quiz.id],
                    'assignee_ids': dept1_member_ids,
                }
                response = client.post('/api/tasks/practice/', data, format='json')
            else:  # EXAM
                data = {
                    'title': f'考试任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'start_time': timezone.now().isoformat(),
                    'duration': 60,
                    'pass_score': 60,
                    'quiz_id': quiz.id,
                    'assignee_ids': dept1_member_ids,
                }
                response = client.post('/api/tasks/exam/', data, format='json')
            
            # Property assertion: dept manager should be able to create task for dept members
            assert response.status_code == 201, \
                f"Dept manager should be able to create {task_type} task for dept members. Got: {response.status_code}, {response.data}"
            
            # Verify all assignments are for dept members
            task_id = response.data['id']
            assignments = TaskAssignment.objects.filter(task_id=task_id)
            for assignment in assignments:
                assert assignment.assignee.department_id == dept1.id, \
                    f"Assignment should be for dept member, but got department_id={assignment.assignee.department_id}"
            
            # Test 2: Dept manager CANNOT create task for other dept members
            if task_type == 'LEARNING':
                data['assignee_ids'] = dept2_member_ids
                response = client.post('/api/tasks/learning/', data, format='json')
            elif task_type == 'PRACTICE':
                data['assignee_ids'] = dept2_member_ids
                response = client.post('/api/tasks/practice/', data, format='json')
            else:  # EXAM
                data['assignee_ids'] = dept2_member_ids
                response = client.post('/api/tasks/exam/', data, format='json')
            
            # Property assertion: dept manager should NOT be able to create task for other dept members
            assert response.status_code == 400, \
                f"Dept manager should NOT be able to create {task_type} task for other dept members. Got: {response.status_code}"
            
        finally:
            # Cleanup
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=dept_manager).delete()
            if task_type == 'LEARNING':
                Knowledge.objects.filter(created_by=dept_manager).delete()
            else:
                Quiz.objects.filter(created_by=dept_manager).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


class TestProperty27ExamTaskUniqueQuiz:
    """
    **Feature: lms-backend, Property 27: 考试任务唯一试卷**
    
    *For any* 考试任务，关联的 TaskQuiz 记录数量必须等于 1。
    **Validates: Requirements 11.1**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_assignees=st.integers(min_value=1, max_value=3),
        duration=st.integers(min_value=30, max_value=180),
        pass_score=st.integers(min_value=0, max_value=100),
    )
    def test_exam_task_has_exactly_one_quiz(
        self,
        setup_roles,
        setup_departments,
        num_assignees,
        duration,
        pass_score,
    ):
        """
        **Feature: lms-backend, Property 27: 考试任务唯一试卷**
        
        For any exam task created through the API, the number of associated
        TaskQuiz records must be exactly 1.
        
        **Validates: Requirements 11.1**
        """
        import uuid
        from decimal import Decimal
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin (can create exam tasks)
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            real_name='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        created_users = [admin]
        assignee_ids = []
        
        try:
            # Create students to assign
            for i in range(num_assignees):
                student = User.objects.create_user(
                    username=f'student_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'STU_{unique_suffix}_{i}',
                    real_name=f'学员{i}',
                    department=dept,
                )
                created_users.append(student)
                assignee_ids.append(student.id)
            
            # Create a quiz for the exam
            from apps.quizzes.models import Quiz
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                created_by=admin,
            )
            
            # Get authenticated client for admin
            client = get_authenticated_client(admin, 'ADMIN')
            
            # Create exam task with single quiz
            data = {
                'title': f'考试任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'start_time': timezone.now().isoformat(),
                'duration': duration,
                'pass_score': str(Decimal(pass_score)),
                'quiz_id': quiz.id,
                'assignee_ids': assignee_ids,
            }
            response = client.post('/api/tasks/exam/', data, format='json')
            
            # Verify task was created
            assert response.status_code == 201, \
                f"Exam task creation should succeed. Got: {response.status_code}, {response.data}"
            
            task_id = response.data['id']
            task = Task.objects.get(id=task_id)
            
            # Property assertion: Exam task must have exactly 1 quiz
            quiz_count = TaskQuiz.objects.filter(task_id=task_id).count()
            assert quiz_count == 1, \
                f"Exam task must have exactly 1 quiz, but has {quiz_count}"
            
            # Also verify via the model property
            assert task.quiz_count == 1, \
                f"Task.quiz_count should be 1, but is {task.quiz_count}"
            
            # Verify the quiz is the one we specified
            task_quiz = TaskQuiz.objects.get(task_id=task_id)
            assert task_quiz.quiz_id == quiz.id, \
                f"TaskQuiz should reference quiz {quiz.id}, but references {task_quiz.quiz_id}"
            
        finally:
            # Cleanup
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_assignees=st.integers(min_value=1, max_value=3),
    )
    def test_exam_task_cannot_have_multiple_quizzes_via_model(
        self,
        setup_roles,
        setup_departments,
        num_assignees,
    ):
        """
        **Feature: lms-backend, Property 27: 考试任务唯一试卷**
        
        For any exam task, attempting to add a second quiz via the model
        should raise a ValidationError.
        
        **Validates: Requirements 11.1**
        """
        import uuid
        from decimal import Decimal
        from django.core.exceptions import ValidationError
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            real_name='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        created_users = [admin]
        
        try:
            # Create two quizzes
            from apps.quizzes.models import Quiz
            quiz1 = Quiz.objects.create(
                title=f'试卷1_{unique_suffix}',
                created_by=admin,
            )
            quiz2 = Quiz.objects.create(
                title=f'试卷2_{unique_suffix}',
                created_by=admin,
            )
            
            # Create an exam task directly via model
            task = Task.objects.create(
                title=f'考试任务_{unique_suffix}',
                task_type='EXAM',
                deadline=timezone.now() + timedelta(days=7),
                start_time=timezone.now(),
                duration=60,
                pass_score=Decimal('60.00'),
                created_by=admin,
            )
            
            # Add first quiz - should succeed
            task_quiz1 = TaskQuiz.objects.create(task=task, quiz=quiz1)
            
            # Attempt to add second quiz - should fail validation
            task_quiz2 = TaskQuiz(task=task, quiz=quiz2)
            
            # Property assertion: Adding second quiz should raise ValidationError
            with pytest.raises(ValidationError):
                task_quiz2.full_clean()
            
            # Verify task still has only 1 quiz
            assert task.task_quizzes.count() == 1, \
                f"Exam task should still have 1 quiz after failed second add"
            
        finally:
            # Cleanup
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            Task.objects.filter(created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_quizzes=st.integers(min_value=1, max_value=5),
        num_assignees=st.integers(min_value=1, max_value=3),
    )
    def test_practice_task_can_have_multiple_quizzes(
        self,
        setup_roles,
        setup_departments,
        num_quizzes,
        num_assignees,
    ):
        """
        **Feature: lms-backend, Property 27: 考试任务唯一试卷**
        
        Contrast test: Practice tasks CAN have multiple quizzes,
        demonstrating that the single-quiz constraint is specific to exam tasks.
        
        **Validates: Requirements 11.1 (by contrast with 9.1)**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            real_name='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        created_users = [admin]
        assignee_ids = []
        
        try:
            # Create students
            for i in range(num_assignees):
                student = User.objects.create_user(
                    username=f'student_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'STU_{unique_suffix}_{i}',
                    real_name=f'学员{i}',
                    department=dept,
                )
                created_users.append(student)
                assignee_ids.append(student.id)
            
            # Create multiple quizzes
            from apps.quizzes.models import Quiz
            quiz_ids = []
            for i in range(num_quizzes):
                quiz = Quiz.objects.create(
                    title=f'试卷{i}_{unique_suffix}',
                    created_by=admin,
                )
                quiz_ids.append(quiz.id)
            
            # Get authenticated client for admin
            client = get_authenticated_client(admin, 'ADMIN')
            
            # Create practice task with multiple quizzes
            data = {
                'title': f'练习任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'quiz_ids': quiz_ids,
                'assignee_ids': assignee_ids,
            }
            response = client.post('/api/tasks/practice/', data, format='json')
            
            # Verify task was created
            assert response.status_code == 201, \
                f"Practice task creation should succeed. Got: {response.status_code}, {response.data}"
            
            task_id = response.data['id']
            task = Task.objects.get(id=task_id)
            
            # Contrast assertion: Practice task CAN have multiple quizzes
            assert task.quiz_count == num_quizzes, \
                f"Practice task should have {num_quizzes} quizzes, but has {task.quiz_count}"
            
        finally:
            # Cleanup
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


class TestProperty19TaskAssignmentRecordCompleteness:
    """
    **Feature: lms-backend, Property 19: 任务分配记录完整性**
    
    *For any* 任务创建操作，TaskAssignment 记录数量应该等于分配的学员数量。
    **Validates: Requirements 7.5, 9.5, 11.6**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_assignees=st.integers(min_value=1, max_value=5),
        task_type=st.sampled_from(['LEARNING', 'PRACTICE', 'EXAM']),
    )
    def test_task_assignment_count_equals_assignee_count(
        self,
        setup_roles,
        setup_departments,
        num_assignees,
        task_type,
    ):
        """
        **Feature: lms-backend, Property 19: 任务分配记录完整性**
        
        For any task creation operation, the number of TaskAssignment records
        should equal the number of assigned students.
        
        **Validates: Requirements 7.5, 9.5, 11.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin (can assign to any student)
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            real_name='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        created_users = [admin]
        assignee_ids = []
        
        try:
            # Create students to assign
            for i in range(num_assignees):
                student = User.objects.create_user(
                    username=f'student_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'STU_{unique_suffix}_{i}',
                    real_name=f'学员{i}',
                    department=dept,
                )
                created_users.append(student)
                assignee_ids.append(student.id)
            
            # Create required resources based on task type
            if task_type == 'LEARNING':
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}',
                    knowledge_type='OTHER',
                    content='测试内容',
                    created_by=admin,
                )
            else:
                quiz = Quiz.objects.create(
                    title=f'试卷_{unique_suffix}',
                    created_by=admin,
                )
            
            # Get authenticated client for admin
            client = get_authenticated_client(admin, 'ADMIN')
            
            # Create task based on type
            if task_type == 'LEARNING':
                data = {
                    'title': f'学习任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'knowledge_ids': [knowledge.id],
                    'assignee_ids': assignee_ids,
                }
                response = client.post('/api/tasks/learning/', data, format='json')
            elif task_type == 'PRACTICE':
                data = {
                    'title': f'练习任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'quiz_ids': [quiz.id],
                    'assignee_ids': assignee_ids,
                }
                response = client.post('/api/tasks/practice/', data, format='json')
            else:  # EXAM
                data = {
                    'title': f'考试任务_{unique_suffix}',
                    'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                    'start_time': timezone.now().isoformat(),
                    'duration': 60,
                    'pass_score': 60,
                    'quiz_id': quiz.id,
                    'assignee_ids': assignee_ids,
                }
                response = client.post('/api/tasks/exam/', data, format='json')
            
            # Verify task was created
            assert response.status_code == 201, \
                f"Task creation should succeed. Got: {response.status_code}, {response.data}"
            
            task_id = response.data['id']
            
            # Property assertion: TaskAssignment count should equal assignee count
            assignment_count = TaskAssignment.objects.filter(task_id=task_id).count()
            assert assignment_count == num_assignees, \
                f"TaskAssignment count ({assignment_count}) should equal assignee count ({num_assignees})"
            
            # Verify each assignee has exactly one assignment
            for assignee_id in assignee_ids:
                assignee_assignment_count = TaskAssignment.objects.filter(
                    task_id=task_id,
                    assignee_id=assignee_id
                ).count()
                assert assignee_assignment_count == 1, \
                    f"Each assignee should have exactly 1 assignment, but assignee {assignee_id} has {assignee_assignment_count}"
            
            # Verify initial status based on task type
            assignments = TaskAssignment.objects.filter(task_id=task_id)
            expected_status = 'PENDING_EXAM' if task_type == 'EXAM' else 'IN_PROGRESS'
            for assignment in assignments:
                assert assignment.status == expected_status, \
                    f"Initial status should be {expected_status} for {task_type} task, got {assignment.status}"
            
        finally:
            # Cleanup
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            if task_type == 'LEARNING':
                Knowledge.objects.filter(created_by=admin).delete()
            else:
                Quiz.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_assignees=st.integers(min_value=1, max_value=5),
    )
    def test_learning_task_assignment_initial_status(
        self,
        setup_roles,
        setup_departments,
        num_assignees,
    ):
        """
        **Feature: lms-backend, Property 19: 任务分配记录完整性**
        
        For any learning task, all TaskAssignment records should have
        initial status 'IN_PROGRESS'.
        
        **Validates: Requirements 7.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            real_name='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        created_users = [admin]
        assignee_ids = []
        
        try:
            # Create students
            for i in range(num_assignees):
                student = User.objects.create_user(
                    username=f'student_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'STU_{unique_suffix}_{i}',
                    real_name=f'学员{i}',
                    department=dept,
                )
                created_users.append(student)
                assignee_ids.append(student.id)
            
            # Create knowledge
            knowledge = Knowledge.objects.create(
                title=f'知识_{unique_suffix}',
                knowledge_type='OTHER',
                content='测试内容',
                created_by=admin,
            )
            
            # Get authenticated client for admin
            client = get_authenticated_client(admin, 'ADMIN')
            
            # Create learning task
            data = {
                'title': f'学习任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'knowledge_ids': [knowledge.id],
                'assignee_ids': assignee_ids,
            }
            response = client.post('/api/tasks/learning/', data, format='json')
            
            assert response.status_code == 201
            task_id = response.data['id']
            
            # Property assertion: all assignments should have IN_PROGRESS status
            assignments = TaskAssignment.objects.filter(task_id=task_id)
            for assignment in assignments:
                assert assignment.status == 'IN_PROGRESS', \
                    f"Learning task assignment should have IN_PROGRESS status, got {assignment.status}"
            
        finally:
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_assignees=st.integers(min_value=1, max_value=5),
    )
    def test_exam_task_assignment_initial_status(
        self,
        setup_roles,
        setup_departments,
        num_assignees,
    ):
        """
        **Feature: lms-backend, Property 19: 任务分配记录完整性**
        
        For any exam task, all TaskAssignment records should have
        initial status 'PENDING_EXAM'.
        
        **Validates: Requirements 11.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            real_name='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        created_users = [admin]
        assignee_ids = []
        
        try:
            # Create students
            for i in range(num_assignees):
                student = User.objects.create_user(
                    username=f'student_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'STU_{unique_suffix}_{i}',
                    real_name=f'学员{i}',
                    department=dept,
                )
                created_users.append(student)
                assignee_ids.append(student.id)
            
            # Create quiz
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                created_by=admin,
            )
            
            # Get authenticated client for admin
            client = get_authenticated_client(admin, 'ADMIN')
            
            # Create exam task
            data = {
                'title': f'考试任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'start_time': timezone.now().isoformat(),
                'duration': 60,
                'pass_score': 60,
                'quiz_id': quiz.id,
                'assignee_ids': assignee_ids,
            }
            response = client.post('/api/tasks/exam/', data, format='json')
            
            assert response.status_code == 201
            task_id = response.data['id']
            
            # Property assertion: all assignments should have PENDING_EXAM status
            assignments = TaskAssignment.objects.filter(task_id=task_id)
            for assignment in assignments:
                assert assignment.status == 'PENDING_EXAM', \
                    f"Exam task assignment should have PENDING_EXAM status, got {assignment.status}"
            
        finally:
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
