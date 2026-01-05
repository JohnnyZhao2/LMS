"""
Property-based tests for Exam Submission.

Tests the following correctness properties:
- Property 28: 考试时间窗口控制
- Property 29: 考试单次提交限制
- Property 31: 主观题待评分状态
- Property 32: 纯客观题直接完成

**Feature: lms-backend**
**Validates: Requirements 12.5, 12.6, 12.7, 12.8**
"""
import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.tasks.models import Task, TaskAssignment, TaskQuiz
from apps.quizzes.models import Quiz, QuizQuestion
from apps.questions.models import Question
from apps.submissions.models import Submission, Answer


# Suppress function-scoped fixture health check
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


def get_authenticated_client(user, role_code=None):
    """Create an authenticated API client for a user with optional role."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    
    if role_code:
        refresh['current_role'] = role_code
        user.current_role = role_code
    
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.user = user
    return client


def create_objective_question(creator, question_type='SINGLE_CHOICE', score=10):
    """Create an objective question for testing."""
    if question_type == 'SINGLE_CHOICE':
        return Question.objects.create(
            content='单选题：1+1=?',
            question_type='SINGLE_CHOICE',
            options=[
                {'key': 'A', 'value': '1'},
                {'key': 'B', 'value': '2'},
                {'key': 'C', 'value': '3'},
                {'key': 'D', 'value': '4'},
            ],
            answer='B',
            explanation='1+1=2',
            score=Decimal(str(score)),
            created_by=creator,
        )
    elif question_type == 'MULTIPLE_CHOICE':
        return Question.objects.create(
            content='多选题：以下哪些是偶数？',
            question_type='MULTIPLE_CHOICE',
            options=[
                {'key': 'A', 'value': '2'},
                {'key': 'B', 'value': '3'},
                {'key': 'C', 'value': '4'},
                {'key': 'D', 'value': '5'},
            ],
            answer=['A', 'C'],
            explanation='2和4是偶数',
            score=Decimal(str(score)),
            created_by=creator,
        )
    elif question_type == 'TRUE_FALSE':
        return Question.objects.create(
            content='判断题：地球是圆的',
            question_type='TRUE_FALSE',
            options=[],
            answer='TRUE',
            explanation='地球是一个近似球体',
            score=Decimal(str(score)),
            created_by=creator,
        )


def create_subjective_question(creator, score=10):
    """Create a subjective question for testing."""
    return Question.objects.create(
        content='简答题：请描述你对学习的理解',
        question_type='SHORT_ANSWER',
        options=[],
        answer='学习是获取知识和技能的过程',
        explanation='参考答案',
        score=Decimal(str(score)),
        created_by=creator,
    )


# ============ Property Tests ============


class TestProperty28ExamTimeWindowControl:
    """
    **Feature: lms-backend, Property 28: 考试时间窗口控制**
    
    *For any* 当前时间不在 [start_time, deadline] 范围内的考试任务，开始考试请求应该返回 400 错误。
    **Validates: Requirements 12.8**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        hours_offset=st.integers(min_value=1, max_value=48),
    )
    def test_exam_before_start_time_rejected(
        self,
        setup_roles,
        setup_departments,
        hours_offset,
    ):
        """
        **Feature: lms-backend, Property 28: 考试时间窗口控制**
        
        For any exam task where current time is before start_time,
        starting the exam should return 400 error.
        
        **Validates: Requirements 12.8**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create a question and quiz
            question = create_objective_question(admin, 'SINGLE_CHOICE', 10)
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
            
            # Create exam task with start_time in the future
            now = timezone.now()
            task = Task.objects.create(
                title=f'考试任务_{unique_suffix}',
                task_type='EXAM',
                start_time=now + timedelta(hours=hours_offset),
                deadline=now + timedelta(hours=hours_offset + 2),
                duration=60,
                pass_score=Decimal('60'),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Property assertion: Starting exam before start_time should fail
            response = student_client.post(
                '/api/submissions/exam/start/',
                {'task_id': task.id},
                format='json'
            )
            
            assert response.status_code == 400, \
                f"Expected 400 for exam before start_time, got {response.status_code}"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            Task.objects.filter(created_by=admin).delete()
            QuizQuestion.objects.filter(quiz__created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            Question.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        hours_past=st.integers(min_value=1, max_value=48),
    )
    def test_exam_after_deadline_rejected(
        self,
        setup_roles,
        setup_departments,
        hours_past,
    ):
        """
        **Feature: lms-backend, Property 28: 考试时间窗口控制**
        
        For any exam task where current time is after deadline,
        starting the exam should return 400 error.
        
        **Validates: Requirements 12.8**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create a question and quiz
            question = create_objective_question(admin, 'SINGLE_CHOICE', 10)
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
            
            # Create exam task with deadline in the past
            now = timezone.now()
            task = Task.objects.create(
                title=f'考试任务_{unique_suffix}',
                task_type='EXAM',
                start_time=now - timedelta(hours=hours_past + 2),
                deadline=now - timedelta(hours=hours_past),
                duration=60,
                pass_score=Decimal('60'),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Property assertion: Starting exam after deadline should fail
            response = student_client.post(
                '/api/submissions/exam/start/',
                {'task_id': task.id},
                format='json'
            )
            
            assert response.status_code == 400, \
                f"Expected 400 for exam after deadline, got {response.status_code}"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            Task.objects.filter(created_by=admin).delete()
            QuizQuestion.objects.filter(quiz__created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            Question.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        hours_into_window=st.integers(min_value=0, max_value=1),
    )
    def test_exam_within_time_window_allowed(
        self,
        setup_roles,
        setup_departments,
        hours_into_window,
    ):
        """
        **Feature: lms-backend, Property 28: 考试时间窗口控制**
        
        For any exam task where current time is within [start_time, deadline],
        starting the exam should succeed.
        
        **Validates: Requirements 12.8**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create a question and quiz
            question = create_objective_question(admin, 'SINGLE_CHOICE', 10)
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
            
            # Create exam task with current time within window
            now = timezone.now()
            task = Task.objects.create(
                title=f'考试任务_{unique_suffix}',
                task_type='EXAM',
                start_time=now - timedelta(hours=hours_into_window),
                deadline=now + timedelta(hours=2),
                duration=60,
                pass_score=Decimal('60'),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Property assertion: Starting exam within time window should succeed
            response = student_client.post(
                '/api/submissions/exam/start/',
                {'task_id': task.id},
                format='json'
            )
            
            assert response.status_code in [200, 201], \
                f"Expected 200/201 for exam within time window, got {response.status_code}: {response.data}"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            Task.objects.filter(created_by=admin).delete()
            QuizQuestion.objects.filter(quiz__created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            Question.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()



class TestProperty29ExamSingleSubmissionLimit:
    """
    **Feature: lms-backend, Property 29: 考试单次提交限制**
    
    *For any* 已有 Submission 记录的考试任务，再次提交应该返回 400 错误。
    **Validates: Requirements 12.7**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        retry_attempts=st.integers(min_value=1, max_value=3),
    )
    def test_exam_resubmission_rejected(
        self,
        setup_roles,
        setup_departments,
        retry_attempts,
    ):
        """
        **Feature: lms-backend, Property 29: 考试单次提交限制**
        
        For any exam task that has already been submitted,
        attempting to start a new exam should return 400 error.
        
        **Validates: Requirements 12.7**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create a question and quiz
            question = create_objective_question(admin, 'SINGLE_CHOICE', 10)
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
            
            # Create exam task within time window
            now = timezone.now()
            task = Task.objects.create(
                title=f'考试任务_{unique_suffix}',
                task_type='EXAM',
                start_time=now - timedelta(hours=1),
                deadline=now + timedelta(hours=2),
                duration=60,
                pass_score=Decimal('60'),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Start and submit the exam first
            response = student_client.post(
                '/api/submissions/exam/start/',
                {'task_id': task.id},
                format='json'
            )
            assert response.status_code in [200, 201], \
                f"Failed to start exam: {response.data}"
            
            submission_id = response.data['id']
            
            # Submit the exam
            response = student_client.post(
                f'/api/submissions/{submission_id}/submit-exam/'
            )
            assert response.status_code == 200, \
                f"Failed to submit exam: {response.data}"
            
            # Property assertion: Attempting to start exam again should fail
            for _ in range(retry_attempts):
                response = student_client.post(
                    '/api/submissions/exam/start/',
                    {'task_id': task.id},
                    format='json'
                )
                
                assert response.status_code == 400, \
                    f"Expected 400 for re-starting submitted exam, got {response.status_code}"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            Task.objects.filter(created_by=admin).delete()
            QuizQuestion.objects.filter(quiz__created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            Question.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()



class TestProperty31SubjectiveQuestionGradingStatus:
    """
    **Feature: lms-backend, Property 31: 主观题待评分状态**
    
    *For any* 包含主观题的 Submission，提交后状态应该是 GRADING。
    **Validates: Requirements 12.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_subjective=st.integers(min_value=1, max_value=3),
        num_objective=st.integers(min_value=0, max_value=3),
    )
    def test_submission_with_subjective_questions_has_grading_status(
        self,
        setup_roles,
        setup_departments,
        num_subjective,
        num_objective,
    ):
        """
        **Feature: lms-backend, Property 31: 主观题待评分状态**
        
        For any submission containing subjective questions,
        after submission the status should be GRADING.
        
        **Validates: Requirements 12.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create quiz with subjective and objective questions
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            
            order = 1
            # Add subjective questions
            for i in range(num_subjective):
                q = create_subjective_question(admin, 10)
                QuizQuestion.objects.create(quiz=quiz, question=q, order=order)
                order += 1
            
            # Add objective questions
            for i in range(num_objective):
                q = create_objective_question(admin, 'SINGLE_CHOICE', 10)
                QuizQuestion.objects.create(quiz=quiz, question=q, order=order)
                order += 1
            
            # Create exam task within time window
            now = timezone.now()
            task = Task.objects.create(
                title=f'考试任务_{unique_suffix}',
                task_type='EXAM',
                start_time=now - timedelta(hours=1),
                deadline=now + timedelta(hours=2),
                duration=60,
                pass_score=Decimal('60'),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Start the exam
            response = student_client.post(
                '/api/submissions/exam/start/',
                {'task_id': task.id},
                format='json'
            )
            assert response.status_code in [200, 201], \
                f"Failed to start exam: {response.data}"
            
            submission_id = response.data['id']
            
            # Submit the exam
            response = student_client.post(
                f'/api/submissions/{submission_id}/submit-exam/'
            )
            assert response.status_code == 200, \
                f"Failed to submit exam: {response.data}"
            
            # Property assertion: Status should be GRADING
            submission = Submission.objects.get(id=submission_id)
            assert submission.status == 'GRADING', \
                f"Expected status GRADING for submission with subjective questions, got {submission.status}"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            Task.objects.filter(created_by=admin).delete()
            QuizQuestion.objects.filter(quiz__created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            Question.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()



class TestProperty32ObjectiveOnlyDirectCompletion:
    """
    **Feature: lms-backend, Property 32: 纯客观题直接完成**
    
    *For any* 仅包含客观题的 Submission，提交后状态应该直接是 GRADED。
    **Validates: Requirements 12.6**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_questions=st.integers(min_value=1, max_value=5),
        question_types=st.lists(
            st.sampled_from(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']),
            min_size=1,
            max_size=5
        ),
    )
    def test_objective_only_submission_has_graded_status(
        self,
        setup_roles,
        setup_departments,
        num_questions,
        question_types,
    ):
        """
        **Feature: lms-backend, Property 32: 纯客观题直接完成**
        
        For any submission containing only objective questions,
        after submission the status should be GRADED directly.
        
        **Validates: Requirements 12.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Ensure question_types matches num_questions
        question_types = question_types[:num_questions]
        while len(question_types) < num_questions:
            question_types.append('SINGLE_CHOICE')
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create quiz with only objective questions
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            
            for i, q_type in enumerate(question_types):
                q = create_objective_question(admin, q_type, 10)
                QuizQuestion.objects.create(quiz=quiz, question=q, order=i + 1)
            
            # Create exam task within time window
            now = timezone.now()
            task = Task.objects.create(
                title=f'考试任务_{unique_suffix}',
                task_type='EXAM',
                start_time=now - timedelta(hours=1),
                deadline=now + timedelta(hours=2),
                duration=60,
                pass_score=Decimal('60'),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Start the exam
            response = student_client.post(
                '/api/submissions/exam/start/',
                {'task_id': task.id},
                format='json'
            )
            assert response.status_code in [200, 201], \
                f"Failed to start exam: {response.data}"
            
            submission_id = response.data['id']
            
            # Submit the exam
            response = student_client.post(
                f'/api/submissions/{submission_id}/submit-exam/'
            )
            assert response.status_code == 200, \
                f"Failed to submit exam: {response.data}"
            
            # Property assertion: Status should be GRADED directly
            submission = Submission.objects.get(id=submission_id)
            assert submission.status == 'GRADED', \
                f"Expected status GRADED for objective-only submission, got {submission.status}"
            
            # Also verify that obtained_score is calculated
            assert submission.obtained_score is not None, \
                "obtained_score should be calculated for objective-only submission"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=admin).delete()
            Task.objects.filter(created_by=admin).delete()
            QuizQuestion.objects.filter(quiz__created_by=admin).delete()
            Quiz.objects.filter(created_by=admin).delete()
            Question.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
