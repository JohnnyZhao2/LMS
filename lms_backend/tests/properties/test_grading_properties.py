"""
Property-based tests for Grading.

Tests the following correctness properties:
- Property 33: 评分完成状态转换
- Property 34: 未完成评分状态保持

**Feature: lms-backend**
**Validates: Requirements 13.4, 13.5**
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


class TestProperty33GradingCompletionStatusTransition:
    """
    **Feature: lms-backend, Property 33: 评分完成状态转换**
    
    *For any* Submission，当所有主观题的 Answer 都有 graded_by 时，Submission 状态应该变为 GRADED。
    **Validates: Requirements 13.4**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_subjective=st.integers(min_value=1, max_value=3),
        num_objective=st.integers(min_value=0, max_value=2),
    )
    def test_grading_all_subjective_questions_changes_status_to_graded(
        self,
        setup_roles,
        setup_departments,
        num_subjective,
        num_objective,
    ):
        """
        **Feature: lms-backend, Property 33: 评分完成状态转换**
        
        For any submission with subjective questions, when all subjective
        questions have been graded (graded_by is set), the submission status
        should automatically change to GRADED.
        
        **Validates: Requirements 13.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MEN_{unique_suffix}',
            username='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        # Create student under mentor
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
            mentor=mentor,
        )
        
        created_users = [mentor, student]
        
        try:
            # Create quiz with subjective and objective questions
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=mentor,
            )
            
            subjective_questions = []
            order = 1
            
            # Add subjective questions
            for i in range(num_subjective):
                q = create_subjective_question(mentor, 10)
                QuizQuestion.objects.create(quiz=quiz, question=q, order=order)
                subjective_questions.append(q)
                order += 1
            
            # Add objective questions
            for i in range(num_objective):
                q = create_objective_question(mentor, 'SINGLE_CHOICE', 10)
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
                created_by=mentor,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client and start/submit exam
            student_client = get_authenticated_client(student, 'STUDENT')
            
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
            
            # Verify submission is in GRADING status
            submission = Submission.objects.get(id=submission_id)
            assert submission.status == 'GRADING', \
                f"Expected GRADING status after submission with subjective questions, got {submission.status}"
            
            # Get mentor client for grading
            mentor_client = get_authenticated_client(mentor, 'MENTOR')
            
            # Get subjective answers
            subjective_answers = Answer.objects.filter(
                submission_id=submission_id,
                question__question_type='SHORT_ANSWER'
            )
            
            # Grade all subjective questions except the last one
            for answer in list(subjective_answers)[:-1]:
                response = mentor_client.post(
                    f'/api/grading/{submission_id}/grade/',
                    {
                        'answer_id': answer.id,
                        'score': 8,
                        'comment': '回答较好'
                    },
                    format='json'
                )
                assert response.status_code == 200, \
                    f"Failed to grade answer: {response.data}"
                
                # Verify submission is still in GRADING status
                submission.refresh_from_db()
                assert submission.status == 'GRADING', \
                    f"Expected GRADING status while not all subjective questions graded, got {submission.status}"
            
            # Grade the last subjective question
            last_answer = list(subjective_answers)[-1]
            response = mentor_client.post(
                f'/api/grading/{submission_id}/grade/',
                {
                    'answer_id': last_answer.id,
                    'score': 9,
                    'comment': '回答很好'
                },
                format='json'
            )
            assert response.status_code == 200, \
                f"Failed to grade last answer: {response.data}"
            
            # Property assertion: Status should now be GRADED
            submission.refresh_from_db()
            assert submission.status == 'GRADED', \
                f"Expected GRADED status after all subjective questions graded, got {submission.status}"
            
            # Verify all subjective answers have graded_by set
            for answer in subjective_answers:
                answer.refresh_from_db()
                assert answer.graded_by is not None, \
                    f"Answer {answer.id} should have graded_by set"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=mentor).delete()
            Task.objects.filter(created_by=mentor).delete()
            QuizQuestion.objects.filter(quiz__created_by=mentor).delete()
            Quiz.objects.filter(created_by=mentor).delete()
            Question.objects.filter(created_by=mentor).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


class TestProperty34UngradedSubjectiveStatusMaintained:
    """
    **Feature: lms-backend, Property 34: 未完成评分状态保持**
    
    *For any* 存在未评分主观题的 Submission，状态应该保持为 GRADING。
    **Validates: Requirements 13.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_subjective=st.integers(min_value=2, max_value=4),
        num_to_grade=st.integers(min_value=0, max_value=3),
    )
    def test_submission_with_ungraded_subjective_remains_grading(
        self,
        setup_roles,
        setup_departments,
        num_subjective,
        num_to_grade,
    ):
        """
        **Feature: lms-backend, Property 34: 未完成评分状态保持**
        
        For any submission with subjective questions where at least one
        subjective question remains ungraded, the submission status should
        remain GRADING.
        
        **Validates: Requirements 13.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Ensure we don't grade all questions
        num_to_grade = min(num_to_grade, num_subjective - 1)
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MEN_{unique_suffix}',
            username='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        # Create student under mentor
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
            mentor=mentor,
        )
        
        created_users = [mentor, student]
        
        try:
            # Create quiz with subjective questions
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=mentor,
            )
            
            # Add subjective questions
            for i in range(num_subjective):
                q = create_subjective_question(mentor, 10)
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
                created_by=mentor,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client and start/submit exam
            student_client = get_authenticated_client(student, 'STUDENT')
            
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
            
            # Verify submission is in GRADING status
            submission = Submission.objects.get(id=submission_id)
            assert submission.status == 'GRADING', \
                f"Expected GRADING status after submission, got {submission.status}"
            
            # Get mentor client for grading
            mentor_client = get_authenticated_client(mentor, 'MENTOR')
            
            # Get subjective answers
            subjective_answers = list(Answer.objects.filter(
                submission_id=submission_id,
                question__question_type='SHORT_ANSWER'
            ))
            
            # Grade only some of the subjective questions (not all)
            for i in range(num_to_grade):
                answer = subjective_answers[i]
                response = mentor_client.post(
                    f'/api/grading/{submission_id}/grade/',
                    {
                        'answer_id': answer.id,
                        'score': 8,
                        'comment': '回答较好'
                    },
                    format='json'
                )
                assert response.status_code == 200, \
                    f"Failed to grade answer: {response.data}"
            
            # Property assertion: Status should still be GRADING
            submission.refresh_from_db()
            assert submission.status == 'GRADING', \
                f"Expected GRADING status while ungraded subjective questions exist, got {submission.status}"
            
            # Verify ungraded count
            ungraded_count = submission.ungraded_subjective_count
            expected_ungraded = num_subjective - num_to_grade
            assert ungraded_count == expected_ungraded, \
                f"Expected {expected_ungraded} ungraded questions, got {ungraded_count}"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=mentor).delete()
            Task.objects.filter(created_by=mentor).delete()
            QuizQuestion.objects.filter(quiz__created_by=mentor).delete()
            Quiz.objects.filter(created_by=mentor).delete()
            Question.objects.filter(created_by=mentor).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_subjective=st.integers(min_value=1, max_value=3),
        num_objective=st.integers(min_value=1, max_value=2),
    )
    def test_mixed_questions_with_ungraded_subjective_remains_grading(
        self,
        setup_roles,
        setup_departments,
        num_subjective,
        num_objective,
    ):
        """
        **Feature: lms-backend, Property 34: 未完成评分状态保持**
        
        For any submission with mixed question types where subjective
        questions remain ungraded, the submission status should remain
        GRADING even though objective questions are auto-graded.
        
        **Validates: Requirements 13.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MEN_{unique_suffix}',
            username='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        # Create student under mentor
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
            mentor=mentor,
        )
        
        created_users = [mentor, student]
        
        try:
            # Create quiz with mixed questions
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=mentor,
            )
            
            order = 1
            # Add objective questions
            for i in range(num_objective):
                q = create_objective_question(mentor, 'SINGLE_CHOICE', 10)
                QuizQuestion.objects.create(quiz=quiz, question=q, order=order)
                order += 1
            
            # Add subjective questions
            for i in range(num_subjective):
                q = create_subjective_question(mentor, 10)
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
                created_by=mentor,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client and start/submit exam
            student_client = get_authenticated_client(student, 'STUDENT')
            
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
            
            # Property assertion: Status should be GRADING (not GRADED)
            submission = Submission.objects.get(id=submission_id)
            assert submission.status == 'GRADING', \
                f"Expected GRADING status with ungraded subjective questions, got {submission.status}"
            
            # Verify objective questions are auto-graded
            objective_answers = Answer.objects.filter(
                submission_id=submission_id,
                question__question_type__in=['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']
            )
            for answer in objective_answers:
                assert answer.is_correct is not None, \
                    f"Objective answer {answer.id} should be auto-graded"
            
            # Verify subjective questions are not graded
            subjective_answers = Answer.objects.filter(
                submission_id=submission_id,
                question__question_type='SHORT_ANSWER'
            )
            for answer in subjective_answers:
                assert answer.graded_by is None, \
                    f"Subjective answer {answer.id} should not be graded yet"
            
            # Verify ungraded count matches subjective count
            assert submission.ungraded_subjective_count == num_subjective, \
                f"Expected {num_subjective} ungraded subjective questions"
            
        finally:
            # Cleanup
            Answer.objects.filter(submission__task_assignment__assignee=student).delete()
            Submission.objects.filter(task_assignment__assignee=student).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            TaskQuiz.objects.filter(task__created_by=mentor).delete()
            Task.objects.filter(created_by=mentor).delete()
            QuizQuestion.objects.filter(quiz__created_by=mentor).delete()
            Quiz.objects.filter(created_by=mentor).delete()
            Question.objects.filter(created_by=mentor).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
