"""
Unit tests for student personal center API.

Requirements: 18.1, 18.2, 18.3, 18.4
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from rest_framework import status

from apps.tasks.models import Task, TaskAssignment, TaskQuiz
from apps.quizzes.models import Quiz, QuizQuestion
from apps.questions.models import Question
from apps.submissions.models import Submission, Answer


@pytest.mark.django_db
class TestStudentProfileAPI:
    """Tests for student profile API endpoint (Requirement 18.1)."""
    
    def test_student_profile_returns_personal_info(self, authenticated_client):
        """
        Test that profile endpoint returns student's personal information.
        
        Requirements: 18.1 - 学员访问个人中心时展示姓名、团队、导师信息
        """
        user = authenticated_client.user
        
        response = authenticated_client.get('/api/analytics/personal-center/profile/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == user.id
        assert response.data['username'] == user.username
        assert response.data['employee_id'] == user.employee_id
        assert response.data['username'] == user.username
    
    def test_student_profile_includes_department(self, authenticated_client):
        """
        Test that profile includes department information.
        
        Requirements: 18.1 - 展示团队信息
        """
        user = authenticated_client.user
        
        response = authenticated_client.get('/api/analytics/personal-center/profile/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'department_id' in response.data
        assert 'department_name' in response.data
        if user.department:
            assert response.data['department_id'] == user.department.id
            assert response.data['department_name'] == user.department.name
    
    def test_student_profile_includes_mentor(self, authenticated_client, create_user, mentor_role):
        """
        Test that profile includes mentor information.
        
        Requirements: 18.1 - 展示导师信息
        """
        from apps.users.models import UserRole
        
        user = authenticated_client.user
        mentor = create_user(username='mentor_user', username='导师张三')
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        # Assign mentor to user
        user.mentor = mentor
        user.save()
        
        response = authenticated_client.get('/api/analytics/personal-center/profile/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['mentor_id'] == mentor.id
        assert response.data['mentor_name'] == mentor.username
    
    def test_student_profile_includes_roles(self, authenticated_client):
        """
        Test that profile includes user's roles.
        
        Requirements: 18.1 - 展示个人信息
        """
        response = authenticated_client.get('/api/analytics/personal-center/profile/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'roles' in response.data
        assert isinstance(response.data['roles'], list)
        # User should have at least STUDENT role
        role_codes = [r['code'] for r in response.data['roles']]
        assert 'STUDENT' in role_codes
    
    def test_student_profile_requires_authentication(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get('/api/analytics/personal-center/profile/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestStudentScoreHistoryAPI:
    """Tests for student score history API endpoint (Requirement 18.2)."""
    
    def test_score_history_returns_practice_scores(self, authenticated_client, create_user):
        """
        Test that score history returns practice task scores.
        
        Requirements: 18.2 - 学员查看历史成绩时展示练习的成绩记录
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        # Create a practice task with submission
        task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='COMPLETED'
        )
        quiz = Quiz.objects.create(title='测试试卷', created_by=creator)
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
        
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('85.00'),
            submitted_at=timezone.now()
        )
        
        response = authenticated_client.get('/api/analytics/personal-center/scores/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) >= 1
        
        # Find our submission
        submission_data = next(
            (s for s in response.data['results'] if s['id'] == submission.id),
            None
        )
        assert submission_data is not None
        assert submission_data['task_type'] == 'PRACTICE'
        assert Decimal(submission_data['obtained_score']) == Decimal('85.00')
    
    def test_score_history_returns_exam_scores(self, authenticated_client, create_user):
        """
        Test that score history returns exam task scores.
        
        Requirements: 18.2 - 学员查看历史成绩时展示考试的成绩记录
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator2')
        
        # Create an exam task with submission
        task = Task.objects.create(
            title='考试任务',
            task_type='EXAM',
            deadline=timezone.now() + timedelta(days=7),
            start_time=timezone.now() - timedelta(hours=1),
            duration=60,
            pass_score=Decimal('60.00'),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='COMPLETED'
        )
        quiz = Quiz.objects.create(title='考试试卷', created_by=creator)
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
        
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('75.00'),
            submitted_at=timezone.now()
        )
        
        response = authenticated_client.get('/api/analytics/personal-center/scores/')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Find our submission
        submission_data = next(
            (s for s in response.data['results'] if s['id'] == submission.id),
            None
        )
        assert submission_data is not None
        assert submission_data['task_type'] == 'EXAM'
        assert submission_data['is_passed'] is True  # 75 >= 60
    
    def test_score_history_filter_by_task_type(self, authenticated_client, create_user):
        """
        Test that score history can be filtered by task type.
        
        Requirements: 18.2 - 展示练习和考试的成绩记录
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator3')
        
        # Create practice and exam tasks
        practice_task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        practice_assignment = TaskAssignment.objects.create(
            task=practice_task,
            assignee=user,
            status='COMPLETED'
        )
        practice_quiz = Quiz.objects.create(title='练习试卷', created_by=creator)
        TaskQuiz.objects.create(task=practice_task, quiz=practice_quiz, order=1)
        Submission.objects.create(
            task_assignment=practice_assignment,
            quiz=practice_quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('80.00'),
            submitted_at=timezone.now()
        )
        
        exam_task = Task.objects.create(
            title='考试任务',
            task_type='EXAM',
            deadline=timezone.now() + timedelta(days=7),
            start_time=timezone.now() - timedelta(hours=1),
            duration=60,
            pass_score=Decimal('60.00'),
            created_by=creator
        )
        exam_assignment = TaskAssignment.objects.create(
            task=exam_task,
            assignee=user,
            status='COMPLETED'
        )
        exam_quiz = Quiz.objects.create(title='考试试卷', created_by=creator)
        TaskQuiz.objects.create(task=exam_task, quiz=exam_quiz, order=1)
        Submission.objects.create(
            task_assignment=exam_assignment,
            quiz=exam_quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('90.00'),
            submitted_at=timezone.now()
        )
        
        # Filter by PRACTICE
        response = authenticated_client.get('/api/analytics/personal-center/scores/?task_type=PRACTICE')
        
        assert response.status_code == status.HTTP_200_OK
        for result in response.data['results']:
            assert result['task_type'] == 'PRACTICE'
    
    def test_score_history_includes_summary(self, authenticated_client):
        """
        Test that score history includes summary statistics.
        
        Requirements: 18.2 - 展示成绩记录
        """
        response = authenticated_client.get('/api/analytics/personal-center/scores/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'summary' in response.data
        assert 'practice' in response.data['summary']
        assert 'exam' in response.data['summary']
    
    def test_score_history_requires_authentication(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get('/api/analytics/personal-center/scores/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestStudentWrongAnswersAPI:
    """Tests for student wrong answers API endpoint (Requirement 18.3)."""
    
    def test_wrong_answers_returns_incorrect_answers(self, authenticated_client, create_user):
        """
        Test that wrong answers endpoint returns incorrect answers.
        
        Requirements: 18.3 - 学员查看错题本时展示练习和考试中答错的题目
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator4')
        
        # Create a practice task with submission and wrong answer
        task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='COMPLETED'
        )
        quiz = Quiz.objects.create(title='测试试卷', created_by=creator)
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
        
        question = Question.objects.create(
            content='测试题目',
            question_type='SINGLE_CHOICE',
            options=[
                {'key': 'A', 'value': '选项A'},
                {'key': 'B', 'value': '选项B'},
            ],
            answer='A',
            score=Decimal('10.00'),
            created_by=creator
        )
        QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
        
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('10.00'),
            obtained_score=Decimal('0.00'),
            submitted_at=timezone.now()
        )
        
        # Create wrong answer
        wrong_answer = Answer.objects.create(
            submission=submission,
            question=question,
            user_answer='B',  # Wrong answer
            is_correct=False,
            obtained_score=Decimal('0.00')
        )
        
        response = authenticated_client.get('/api/analytics/personal-center/wrong-answers/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert len(response.data['results']) >= 1
        
        # Find our wrong answer
        answer_data = next(
            (a for a in response.data['results'] if a['id'] == wrong_answer.id),
            None
        )
        assert answer_data is not None
        assert answer_data['user_answer'] == 'B'
        assert answer_data['correct_answer'] == 'A'
    
    def test_wrong_answers_excludes_correct_answers(self, authenticated_client, create_user):
        """
        Test that wrong answers endpoint excludes correct answers.
        
        Requirements: 18.3 - 展示答错的题目
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator5')
        
        # Create a practice task with submission and correct answer
        task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='COMPLETED'
        )
        quiz = Quiz.objects.create(title='测试试卷', created_by=creator)
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
        
        question = Question.objects.create(
            content='测试题目',
            question_type='SINGLE_CHOICE',
            options=[
                {'key': 'A', 'value': '选项A'},
                {'key': 'B', 'value': '选项B'},
            ],
            answer='A',
            score=Decimal('10.00'),
            created_by=creator
        )
        QuizQuestion.objects.create(quiz=quiz, question=question, order=1)
        
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('10.00'),
            obtained_score=Decimal('10.00'),
            submitted_at=timezone.now()
        )
        
        # Create correct answer
        correct_answer = Answer.objects.create(
            submission=submission,
            question=question,
            user_answer='A',  # Correct answer
            is_correct=True,
            obtained_score=Decimal('10.00')
        )
        
        response = authenticated_client.get('/api/analytics/personal-center/wrong-answers/')
        
        assert response.status_code == status.HTTP_200_OK
        # Correct answer should not be in results
        answer_ids = [a['id'] for a in response.data['results']]
        assert correct_answer.id not in answer_ids
    
    def test_wrong_answers_filter_by_question_type(self, authenticated_client, create_user):
        """
        Test that wrong answers can be filtered by question type.
        
        Requirements: 18.3 - 展示错题本
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator6')
        
        # Create task and submission
        task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='COMPLETED'
        )
        quiz = Quiz.objects.create(title='测试试卷', created_by=creator)
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
        
        # Create single choice question
        single_q = Question.objects.create(
            content='单选题',
            question_type='SINGLE_CHOICE',
            options=[{'key': 'A', 'value': '选项A'}, {'key': 'B', 'value': '选项B'}],
            answer='A',
            score=Decimal('10.00'),
            created_by=creator
        )
        QuizQuestion.objects.create(quiz=quiz, question=single_q, order=1)
        
        # Create multiple choice question
        multi_q = Question.objects.create(
            content='多选题',
            question_type='MULTIPLE_CHOICE',
            options=[{'key': 'A', 'value': '选项A'}, {'key': 'B', 'value': '选项B'}],
            answer=['A', 'B'],
            score=Decimal('10.00'),
            created_by=creator
        )
        QuizQuestion.objects.create(quiz=quiz, question=multi_q, order=2)
        
        submission = Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('20.00'),
            obtained_score=Decimal('0.00'),
            submitted_at=timezone.now()
        )
        
        # Create wrong answers for both
        Answer.objects.create(
            submission=submission,
            question=single_q,
            user_answer='B',
            is_correct=False,
            obtained_score=Decimal('0.00')
        )
        Answer.objects.create(
            submission=submission,
            question=multi_q,
            user_answer=['A'],
            is_correct=False,
            obtained_score=Decimal('0.00')
        )
        
        # Filter by SINGLE_CHOICE
        response = authenticated_client.get(
            '/api/analytics/personal-center/wrong-answers/?question_type=SINGLE_CHOICE'
        )
        
        assert response.status_code == status.HTTP_200_OK
        for result in response.data['results']:
            assert result['question_type'] == 'SINGLE_CHOICE'
    
    def test_wrong_answers_includes_summary(self, authenticated_client):
        """
        Test that wrong answers includes summary statistics.
        
        Requirements: 18.3 - 展示错题本
        """
        response = authenticated_client.get('/api/analytics/personal-center/wrong-answers/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'summary' in response.data
        assert 'total_count' in response.data['summary']
        assert 'by_type' in response.data['summary']
    
    def test_wrong_answers_requires_authentication(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get('/api/analytics/personal-center/wrong-answers/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestStudentScoreExportAPI:
    """Tests for student score export API endpoint (Requirement 18.4)."""
    
    def test_score_export_returns_csv(self, authenticated_client, create_user):
        """
        Test that score export returns a CSV file.
        
        Requirements: 18.4 - 学员导出记录时生成包含历史成绩的导出文件
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator7')
        
        # Create a practice task with submission
        task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='COMPLETED'
        )
        quiz = Quiz.objects.create(title='测试试卷', created_by=creator)
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
        
        Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('85.00'),
            submitted_at=timezone.now()
        )
        
        response = authenticated_client.get('/api/analytics/personal-center/scores/export/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response['Content-Type'] == 'text/csv; charset=utf-8-sig'
        assert 'attachment' in response['Content-Disposition']
        assert '.csv' in response['Content-Disposition']
    
    def test_score_export_contains_data(self, authenticated_client, create_user):
        """
        Test that exported CSV contains score data.
        
        Requirements: 18.4 - 生成包含历史成绩的导出文件
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator8')
        
        # Create a practice task with submission
        task = Task.objects.create(
            title='测试练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='COMPLETED'
        )
        quiz = Quiz.objects.create(title='测试试卷名称', created_by=creator)
        TaskQuiz.objects.create(task=task, quiz=quiz, order=1)
        
        Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('85.00'),
            submitted_at=timezone.now()
        )
        
        response = authenticated_client.get('/api/analytics/personal-center/scores/export/')
        
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8-sig')
        
        # Check header row
        assert '任务名称' in content
        assert '试卷名称' in content
        assert '获得分数' in content
        
        # Check data row
        assert '测试练习任务' in content
        assert '测试试卷名称' in content
    
    def test_score_export_filter_by_task_type(self, authenticated_client, create_user):
        """
        Test that score export can be filtered by task type.
        
        Requirements: 18.4 - 导出记录
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator9')
        
        # Create practice and exam tasks
        practice_task = Task.objects.create(
            title='练习任务导出',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        practice_assignment = TaskAssignment.objects.create(
            task=practice_task,
            assignee=user,
            status='COMPLETED'
        )
        practice_quiz = Quiz.objects.create(title='练习试卷', created_by=creator)
        TaskQuiz.objects.create(task=practice_task, quiz=practice_quiz, order=1)
        Submission.objects.create(
            task_assignment=practice_assignment,
            quiz=practice_quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('80.00'),
            submitted_at=timezone.now()
        )
        
        exam_task = Task.objects.create(
            title='考试任务导出',
            task_type='EXAM',
            deadline=timezone.now() + timedelta(days=7),
            start_time=timezone.now() - timedelta(hours=1),
            duration=60,
            pass_score=Decimal('60.00'),
            created_by=creator
        )
        exam_assignment = TaskAssignment.objects.create(
            task=exam_task,
            assignee=user,
            status='COMPLETED'
        )
        exam_quiz = Quiz.objects.create(title='考试试卷', created_by=creator)
        TaskQuiz.objects.create(task=exam_task, quiz=exam_quiz, order=1)
        Submission.objects.create(
            task_assignment=exam_assignment,
            quiz=exam_quiz,
            user=user,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('90.00'),
            submitted_at=timezone.now()
        )
        
        # Export only practice
        response = authenticated_client.get(
            '/api/analytics/personal-center/scores/export/?task_type=PRACTICE'
        )
        
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode('utf-8-sig')
        
        assert '练习任务导出' in content
        assert '考试任务导出' not in content
    
    def test_score_export_requires_authentication(self, api_client):
        """Test that unauthenticated requests are rejected."""
        response = api_client.get('/api/analytics/personal-center/scores/export/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
