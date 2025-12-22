"""
Property-based tests for Practice Submission.

Tests the following correctness properties:
- Property 24: 练习允许多次提交
- Property 25: 练习任务自动完成
- Property 26: 已完成练习仍可继续
- Property 30: 客观题自动评分

**Feature: lms-backend**
**Validates: Requirements 10.3, 10.5, 10.6, 10.7, 12.4**
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


class TestProperty24PracticeAllowsMultipleSubmissions:
    """
    **Feature: lms-backend, Property 24: 练习允许多次提交**
    
    *For any* 练习任务的 Submission，attempt_number 可以大于 1。
    **Validates: Requirements 10.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_attempts=st.integers(min_value=2, max_value=5),
    )
    def test_practice_allows_multiple_submissions(
        self,
        setup_roles,
        setup_departments,
        num_attempts,
    ):
        """
        **Feature: lms-backend, Property 24: 练习允许多次提交**
        
        For any practice task, a student should be able to submit multiple
        times, with attempt_number incrementing for each submission.
        
        **Validates: Requirements 10.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create a question
            question = create_objective_question(admin, 'SINGLE_CHOICE', 10)
            
            # Create a quiz with the question
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
            
            # Create practice task
            task = Task.objects.create(
                title=f'练习任务_{unique_suffix}',
                task_type='PRACTICE',
                deadline=timezone.now() + timedelta(days=7),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            submission_ids = []
            
            # Submit multiple times
            for attempt in range(1, num_attempts + 1):
                # Start practice
                response = student_client.post(
                    '/api/submissions/practice/start/',
                    {'assignment_id': assignment.id, 'quiz_id': quiz.id},
                    format='json'
                )
                assert response.status_code == 201, f"Start practice failed: {response.data}"
                
                submission_id = response.data['id']
                submission_ids.append(submission_id)
                
                # Verify attempt number
                submission = Submission.objects.get(id=submission_id)
                assert submission.attempt_number == attempt, \
                    f"Expected attempt_number {attempt}, got {submission.attempt_number}"
                
                # Save an answer
                answer = submission.answers.first()
                response = student_client.post(
                    f'/api/submissions/{submission_id}/save-answer/',
                    {'question_id': question.id, 'user_answer': 'B'},
                    format='json'
                )
                assert response.status_code == 200
                
                # Submit the practice
                response = student_client.post(
                    f'/api/submissions/{submission_id}/submit-practice/'
                )
                assert response.status_code == 200, f"Submit practice failed: {response.data}"
            
            # Property assertion: All submissions should exist with correct attempt numbers
            submissions = Submission.objects.filter(
                task_assignment=assignment,
                quiz=quiz
            ).order_by('attempt_number')
            
            assert submissions.count() == num_attempts, \
                f"Expected {num_attempts} submissions, got {submissions.count()}"
            
            for i, sub in enumerate(submissions, 1):
                assert sub.attempt_number == i, \
                    f"Submission {i} has attempt_number {sub.attempt_number}"
            
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


class TestProperty25PracticeTaskAutoCompletion:
    """
    **Feature: lms-backend, Property 25: 练习任务自动完成**
    
    *For any* 练习任务，当所有关联试卷都至少有一次 Submission 时，TaskAssignment 状态应该变为 COMPLETED。
    **Validates: Requirements 10.6**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_quizzes=st.integers(min_value=1, max_value=3),
    )
    def test_practice_task_auto_completes_when_all_quizzes_submitted(
        self,
        setup_roles,
        setup_departments,
        num_quizzes,
    ):
        """
        **Feature: lms-backend, Property 25: 练习任务自动完成**
        
        For any practice task, when all associated quizzes have at least
        one submission, the TaskAssignment status should automatically
        change to COMPLETED.
        
        **Validates: Requirements 10.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create quizzes with questions
            quizzes = []
            for i in range(num_quizzes):
                question = create_objective_question(admin, 'SINGLE_CHOICE', 10)
                quiz = Quiz.objects.create(
                    title=f'试卷_{unique_suffix}_{i}',
                    description=f'测试试卷{i}',
                    created_by=admin,
                )
                QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
                quizzes.append(quiz)
            
            # Create practice task with all quizzes
            task = Task.objects.create(
                title=f'练习任务_{unique_suffix}',
                task_type='PRACTICE',
                deadline=timezone.now() + timedelta(days=7),
                created_by=admin,
            )
            for i, quiz in enumerate(quizzes):
                TaskQuiz.objects.create(task=task, quiz=quiz, order=i + 1)
            
            # Create assignment
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Submit all quizzes except the last one
            for i, quiz in enumerate(quizzes[:-1]):
                # Start practice
                response = student_client.post(
                    '/api/submissions/practice/start/',
                    {'task_id': task.id, 'quiz_id': quiz.id},
                    format='json'
                )
                assert response.status_code == 201
                
                submission_id = response.data['id']
                
                # Submit the practice
                response = student_client.post(
                    f'/api/submissions/{submission_id}/submit-practice/'
                )
                assert response.status_code == 200
                
                # Verify task is NOT completed yet
                assignment.refresh_from_db()
                assert assignment.status == 'IN_PROGRESS', \
                    f"Task should still be IN_PROGRESS after {i+1}/{num_quizzes} quizzes"
            
            # Submit the last quiz
            last_quiz = quizzes[-1]
            response = student_client.post(
                '/api/submissions/practice/start/',
                {'task_id': task.id, 'quiz_id': last_quiz.id},
                format='json'
            )
            assert response.status_code == 201
            
            submission_id = response.data['id']
            
            response = student_client.post(
                f'/api/submissions/{submission_id}/submit-practice/'
            )
            assert response.status_code == 200
            
            # Property assertion: Task should now be COMPLETED
            assignment.refresh_from_db()
            assert assignment.status == 'COMPLETED', \
                f"Task should be COMPLETED after all quizzes submitted, got {assignment.status}"
            
            assert assignment.completed_at is not None, \
                "completed_at should be set when task is completed"
            
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


class TestProperty26CompletedPracticeCanContinue:
    """
    **Feature: lms-backend, Property 26: 已完成练习仍可继续**
    
    *For any* 状态为 COMPLETED 的练习任务，学员仍然可以创建新的 Submission。
    **Validates: Requirements 10.7**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        additional_attempts=st.integers(min_value=1, max_value=3),
    )
    def test_completed_practice_allows_more_submissions(
        self,
        setup_roles,
        setup_departments,
        additional_attempts,
    ):
        """
        **Feature: lms-backend, Property 26: 已完成练习仍可继续**
        
        For any practice task that is already COMPLETED, the student
        should still be able to create new submissions.
        
        **Validates: Requirements 10.7**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
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
            
            # Create practice task
            task = Task.objects.create(
                title=f'练习任务_{unique_suffix}',
                task_type='PRACTICE',
                deadline=timezone.now() + timedelta(days=7),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Complete the task first (submit once)
            response = student_client.post(
                '/api/submissions/practice/start/',
                {'task_id': task.id, 'quiz_id': quiz.id},
                format='json'
            )
            assert response.status_code == 201
            
            submission_id = response.data['id']
            
            response = student_client.post(
                f'/api/submissions/{submission_id}/submit-practice/'
            )
            assert response.status_code == 200
            
            # Verify task is COMPLETED
            assignment.refresh_from_db()
            assert assignment.status == 'COMPLETED', \
                f"Task should be COMPLETED, got {assignment.status}"
            
            # Property assertion: Should be able to submit more times
            for attempt in range(additional_attempts):
                response = student_client.post(
                    '/api/submissions/practice/start/',
                    {'task_id': task.id, 'quiz_id': quiz.id},
                    format='json'
                )
                assert response.status_code == 201, \
                    f"Should be able to start practice after completion, got {response.status_code}: {response.data}"
                
                new_submission_id = response.data['id']
                
                # Verify new submission was created
                new_submission = Submission.objects.get(id=new_submission_id)
                assert new_submission.attempt_number == attempt + 2, \
                    f"Expected attempt_number {attempt + 2}, got {new_submission.attempt_number}"
                
                # Submit the new practice
                response = student_client.post(
                    f'/api/submissions/{new_submission_id}/submit-practice/'
                )
                assert response.status_code == 200
            
            # Verify total submissions
            total_submissions = Submission.objects.filter(
                task_assignment=assignment,
                quiz=quiz
            ).count()
            assert total_submissions == 1 + additional_attempts, \
                f"Expected {1 + additional_attempts} submissions, got {total_submissions}"
            
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


class TestProperty30ObjectiveQuestionAutoGrading:
    """
    **Feature: lms-backend, Property 30: 客观题自动评分**
    
    *For any* 提交的客观题答案（单选/多选/判断），系统应该自动计算 is_correct 和 score。
    **Validates: Requirements 10.3, 12.4**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_type=st.sampled_from(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE']),
        answer_correctly=st.booleans(),
    )
    def test_objective_questions_auto_graded_on_submit(
        self,
        setup_roles,
        setup_departments,
        question_type,
        answer_correctly,
    ):
        """
        **Feature: lms-backend, Property 30: 客观题自动评分**
        
        For any submitted objective question answer (single choice, multiple
        choice, true/false), the system should automatically calculate
        is_correct and score.
        
        **Validates: Requirements 10.3, 12.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create question based on type
            question_score = Decimal('10')
            question = create_objective_question(admin, question_type, 10)
            
            # Determine correct and incorrect answers
            if question_type == 'SINGLE_CHOICE':
                correct_answer = 'B'
                incorrect_answer = 'A'
            elif question_type == 'MULTIPLE_CHOICE':
                correct_answer = ['A', 'C']
                incorrect_answer = ['A', 'B']
            else:  # TRUE_FALSE
                correct_answer = 'TRUE'
                incorrect_answer = 'FALSE'
            
            user_answer = correct_answer if answer_correctly else incorrect_answer
            
            # Create quiz
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
            
            # Create practice task
            task = Task.objects.create(
                title=f'练习任务_{unique_suffix}',
                task_type='PRACTICE',
                deadline=timezone.now() + timedelta(days=7),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Start practice
            response = student_client.post(
                '/api/submissions/practice/start/',
                {'task_id': task.id, 'quiz_id': quiz.id},
                format='json'
            )
            assert response.status_code == 201
            
            submission_id = response.data['id']
            
            # Save answer
            response = student_client.post(
                f'/api/submissions/{submission_id}/save-answer/',
                {'question_id': question.id, 'user_answer': user_answer},
                format='json'
            )
            assert response.status_code == 200
            
            # Submit practice
            response = student_client.post(
                f'/api/submissions/{submission_id}/submit-practice/'
            )
            assert response.status_code == 200
            
            # Property assertion: Answer should be auto-graded
            answer = Answer.objects.get(submission_id=submission_id, question=question)
            
            assert answer.is_correct is not None, \
                "is_correct should be set after submission"
            
            if answer_correctly:
                assert answer.is_correct is True, \
                    f"Answer should be correct for {question_type}"
                assert answer.obtained_score == question_score, \
                    f"Score should be {question_score} for correct answer, got {answer.obtained_score}"
            else:
                assert answer.is_correct is False, \
                    f"Answer should be incorrect for {question_type}"
                assert answer.obtained_score == Decimal('0'), \
                    f"Score should be 0 for incorrect answer, got {answer.obtained_score}"
            
            # Verify submission score
            submission = Submission.objects.get(id=submission_id)
            expected_score = question_score if answer_correctly else Decimal('0')
            assert submission.obtained_score == expected_score, \
                f"Submission score should be {expected_score}, got {submission.obtained_score}"
            
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
        num_questions=st.integers(min_value=2, max_value=5),
        correct_indices=st.lists(st.booleans(), min_size=2, max_size=5),
    )
    def test_multiple_objective_questions_auto_graded(
        self,
        setup_roles,
        setup_departments,
        num_questions,
        correct_indices,
    ):
        """
        **Feature: lms-backend, Property 30: 客观题自动评分**
        
        For any submission with multiple objective questions, all questions
        should be auto-graded and the total score should be calculated correctly.
        
        **Validates: Requirements 10.3, 12.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Ensure correct_indices matches num_questions
        correct_indices = correct_indices[:num_questions]
        while len(correct_indices) < num_questions:
            correct_indices.append(False)
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create questions
            questions = []
            question_score = Decimal('10')
            for i in range(num_questions):
                q = Question.objects.create(
                    content=f'单选题{i}：1+{i}=?',
                    question_type='SINGLE_CHOICE',
                    options=[
                        {'key': 'A', 'value': str(i)},
                        {'key': 'B', 'value': str(1 + i)},
                        {'key': 'C', 'value': str(2 + i)},
                        {'key': 'D', 'value': str(3 + i)},
                    ],
                    answer='B',
                    explanation=f'1+{i}={1+i}',
                    score=question_score,
                    created_by=admin,
                )
                questions.append(q)
            
            # Create quiz
            quiz = Quiz.objects.create(
                title=f'试卷_{unique_suffix}',
                description='测试试卷',
                created_by=admin,
            )
            for i, q in enumerate(questions):
                QuizQuestion.objects.create(quiz=quiz, question=q, order=i + 1)
            
            # Create practice task
            task = Task.objects.create(
                title=f'练习任务_{unique_suffix}',
                task_type='PRACTICE',
                deadline=timezone.now() + timedelta(days=7),
                created_by=admin,
            )
            TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
            
            # Create assignment
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Start practice
            response = student_client.post(
                '/api/submissions/practice/start/',
                {'task_id': task.id, 'quiz_id': quiz.id},
                format='json'
            )
            assert response.status_code == 201
            
            submission_id = response.data['id']
            
            # Save answers
            for i, (q, is_correct) in enumerate(zip(questions, correct_indices)):
                user_answer = 'B' if is_correct else 'A'
                response = student_client.post(
                    f'/api/submissions/{submission_id}/save-answer/',
                    {'question_id': q.id, 'user_answer': user_answer},
                    format='json'
                )
                assert response.status_code == 200
            
            # Submit practice
            response = student_client.post(
                f'/api/submissions/{submission_id}/submit-practice/'
            )
            assert response.status_code == 200
            
            # Property assertion: All answers should be graded correctly
            submission = Submission.objects.get(id=submission_id)
            
            expected_correct_count = sum(correct_indices)
            expected_score = question_score * expected_correct_count
            
            # Check each answer
            for i, (q, should_be_correct) in enumerate(zip(questions, correct_indices)):
                answer = Answer.objects.get(submission=submission, question=q)
                assert answer.is_correct == should_be_correct, \
                    f"Question {i} is_correct should be {should_be_correct}, got {answer.is_correct}"
                
                expected_answer_score = question_score if should_be_correct else Decimal('0')
                assert answer.obtained_score == expected_answer_score, \
                    f"Question {i} score should be {expected_answer_score}, got {answer.obtained_score}"
            
            # Check total score
            assert submission.obtained_score == expected_score, \
                f"Total score should be {expected_score}, got {submission.obtained_score}"
            
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
