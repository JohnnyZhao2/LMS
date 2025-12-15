"""
Integration tests for complete practice task business flow.

Tests the end-to-end flow:
1. Create questions and quiz
2. Create practice task
3. Student takes practice
4. Auto-grading for objective questions
5. Multiple attempts allowed
6. Task auto-completes after first attempt

Requirements: 5.1, 6.1-6.2, 9.1-9.5, 10.1-10.7
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.questions.models import Question
from apps.quizzes.models import Quiz, QuizQuestion
from apps.tasks.models import Task, TaskAssignment
from apps.submissions.models import Submission


@pytest.fixture
def setup_practice_flow(db):
    """Set up complete environment for practice task flow."""
    dept = Department.objects.create(name='一室', code='DEPT001')
    
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    
    admin = User.objects.create_user(
        username='admin', password='admin123', employee_id='ADMIN001',
        real_name='管理员', department=dept
    )
    UserRole.objects.create(user=admin, role=admin_role)
    
    mentor = User.objects.create_user(
        username='mentor', password='mentor123', employee_id='MENTOR001',
        real_name='导师', department=dept
    )
    UserRole.objects.create(user=mentor, role=mentor_role)
    
    student = User.objects.create_user(
        username='student', password='student123', employee_id='STU001',
        real_name='学员', department=dept, mentor=mentor
    )
    
    return {'dept': dept, 'admin': admin, 'mentor': mentor, 'student': student}


def get_client(user):
    """Get authenticated API client for user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestCompletePracticeTaskFlow:
    """Integration test for complete practice task flow."""
    
    def test_complete_practice_task_flow(self, setup_practice_flow):
        """
        Test complete practice task flow end-to-end.
        
        Flow:
        1. Mentor creates questions
        2. Mentor creates quiz with questions
        3. Mentor creates practice task
        4. Student starts practice
        5. Student submits answers
        6. Auto-grading occurs
        7. Student can practice again
        """
        data = setup_practice_flow
        mentor_client = get_client(data['mentor'])
        student_client = get_client(data['student'])
        
        # Step 1: Create questions
        q1_resp = mentor_client.post('/api/questions/', {
            'content': '1 + 1 = ?',
            'question_type': 'SINGLE_CHOICE',
            'options': [
                {'key': 'A', 'value': '1'},
                {'key': 'B', 'value': '2'},
                {'key': 'C', 'value': '3'},
                {'key': 'D', 'value': '4'},
            ],
            'answer': 'B',
            'explanation': '1 + 1 = 2',
            'score': 25.0,
        }, format='json')
        assert q1_resp.status_code == status.HTTP_201_CREATED
        q1_id = q1_resp.json()['id']
        
        q2_resp = mentor_client.post('/api/questions/', {
            'content': '以下哪些是编程语言？',
            'question_type': 'MULTIPLE_CHOICE',
            'options': [
                {'key': 'A', 'value': 'Python'},
                {'key': 'B', 'value': 'HTML'},
                {'key': 'C', 'value': 'Java'},
                {'key': 'D', 'value': 'CSS'},
            ],
            'answer': ['A', 'C'],
            'explanation': 'Python和Java是编程语言',
            'score': 25.0,
        }, format='json')
        assert q2_resp.status_code == status.HTTP_201_CREATED
        q2_id = q2_resp.json()['id']
        
        q3_resp = mentor_client.post('/api/questions/', {
            'content': 'Python是解释型语言',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'explanation': 'Python是解释型语言',
            'score': 25.0,
        }, format='json')
        assert q3_resp.status_code == status.HTTP_201_CREATED
        q3_id = q3_resp.json()['id']
        
        q4_resp = mentor_client.post('/api/questions/', {
            'content': '2 + 2 = ?',
            'question_type': 'SINGLE_CHOICE',
            'options': [
                {'key': 'A', 'value': '3'},
                {'key': 'B', 'value': '4'},
                {'key': 'C', 'value': '5'},
            ],
            'answer': 'B',
            'explanation': '2 + 2 = 4',
            'score': 25.0,
        }, format='json')
        assert q4_resp.status_code == status.HTTP_201_CREATED
        q4_id = q4_resp.json()['id']
        
        # Step 2: Create quiz
        quiz_resp = mentor_client.post('/api/quizzes/', {
            'title': '基础测试',
            'description': '基础知识测试',
        }, format='json')
        assert quiz_resp.status_code == status.HTTP_201_CREATED
        quiz_id = quiz_resp.json()['id']
        
        # Add questions to quiz
        add_q_resp = mentor_client.post(f'/api/quizzes/{quiz_id}/add-questions/', {
            'existing_question_ids': [q1_id, q2_id, q3_id, q4_id]
        }, format='json')
        assert add_q_resp.status_code == status.HTTP_200_OK
        
        # Step 3: Create practice task
        deadline = timezone.now() + timedelta(days=7)
        task_resp = mentor_client.post('/api/tasks/practice/', {
            'title': '基础练习',
            'description': '请完成基础知识练习',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_id],
            'assignee_ids': [data['student'].id]
        }, format='json')
        assert task_resp.status_code == status.HTTP_201_CREATED
        task_id = task_resp.json()['id']
        
        # Step 4: Student starts practice
        start_resp = student_client.post('/api/submissions/practice/start/', {
            'task_id': task_id,
            'quiz_id': quiz_id
        }, format='json')
        assert start_resp.status_code == status.HTTP_201_CREATED
        submission_id = start_resp.json()['id']
        
        # Verify submission created
        assert start_resp.json()['attempt_number'] == 1
        assert 'answers' in start_resp.json()  # Response uses 'answers' not 'questions'
        
        # Save answers first
        student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q1_id,
            'user_answer': 'B'
        }, format='json')
        student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q2_id,
            'user_answer': ['A', 'C']
        }, format='json')
        student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q3_id,
            'user_answer': 'TRUE'
        }, format='json')
        student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q4_id,
            'user_answer': 'A'
        }, format='json')
        
        # Step 5: Student submits answers
        submit_resp = student_client.post(f'/api/submissions/{submission_id}/submit-practice/')
        assert submit_resp.status_code == status.HTTP_200_OK
        
        # Step 6: Verify submission completed (Property 30)
        result = submit_resp.json()
        assert result['status'] == 'GRADED'
        # Total score should be set
        assert result['total_score'] is not None
        
        # Verify task auto-completed (Property 25)
        assignment = TaskAssignment.objects.get(task_id=task_id, assignee=data['student'])
        assert assignment.status == 'COMPLETED'
        
        # Step 7: Student can practice again (Property 24, 26)
        start2_resp = student_client.post('/api/submissions/practice/start/', {
            'task_id': task_id,
            'quiz_id': quiz_id
        }, format='json')
        assert start2_resp.status_code == status.HTTP_201_CREATED
        assert start2_resp.json()['attempt_number'] == 2
        
        submission2_id = start2_resp.json()['id']
        
        # Save answers for second attempt
        student_client.post(f'/api/submissions/{submission2_id}/save-answer/', {
            'question_id': q1_id,
            'user_answer': 'B'
        }, format='json')
        student_client.post(f'/api/submissions/{submission2_id}/save-answer/', {
            'question_id': q2_id,
            'user_answer': ['A', 'C']
        }, format='json')
        student_client.post(f'/api/submissions/{submission2_id}/save-answer/', {
            'question_id': q3_id,
            'user_answer': 'TRUE'
        }, format='json')
        student_client.post(f'/api/submissions/{submission2_id}/save-answer/', {
            'question_id': q4_id,
            'user_answer': 'B'  # Now correct
        }, format='json')
        
        # Submit second attempt with all correct
        submit2_resp = student_client.post(f'/api/submissions/{submission2_id}/submit-practice/')
        assert submit2_resp.status_code == status.HTTP_200_OK
        assert submit2_resp.json()['status'] == 'GRADED'
        
        # Verify multiple submissions exist
        submissions = Submission.objects.filter(
            task_assignment__task_id=task_id,
            user=data['student']
        )
        assert submissions.count() == 2
