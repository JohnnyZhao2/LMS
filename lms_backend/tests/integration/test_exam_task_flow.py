"""
Integration tests for complete exam task business flow.

Tests the end-to-end flow:
1. Create quiz with objective and subjective questions
2. Create exam task with time window
3. Student takes exam within time window
4. Auto-grading for objective questions
5. Manual grading for subjective questions
6. Final score calculation

Requirements: 11.1-11.6, 12.1-12.8, 13.1-13.5
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
from apps.submissions.models import Submission, Answer


@pytest.fixture
def setup_exam_flow(db):
    """Set up complete environment for exam task flow."""
    dept = Department.objects.create(name='一室', code='DEPT001')
    
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    
    admin = User.objects.create_user(
        username='管理员', password='admin123', employee_id='ADMIN001',
        department=dept
    )
    UserRole.objects.create(user=admin, role=admin_role)
    
    mentor = User.objects.create_user(
        username='导师', password='mentor123', employee_id='MENTOR001',
        department=dept
    )
    UserRole.objects.create(user=mentor, role=mentor_role)
    
    student = User.objects.create_user(
        username='学员', password='student123', employee_id='STU001',
        department=dept, mentor=mentor
    )
    
    return {'dept': dept, 'admin': admin, 'mentor': mentor, 'student': student}


def get_client(user):
    """Get authenticated API client for user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestCompleteExamTaskFlow:
    """Integration test for complete exam task flow with subjective questions."""
    
    def test_exam_with_subjective_questions_flow(self, setup_exam_flow):
        """
        Test complete exam flow with subjective questions requiring manual grading.
        
        Flow:
        1. Create questions (objective + subjective)
        2. Create quiz
        3. Create exam task
        4. Student takes exam
        5. Auto-grading for objective questions
        6. Mentor grades subjective questions
        7. Final score calculated
        """
        data = setup_exam_flow
        mentor_client = get_client(data['mentor'])
        student_client = get_client(data['student'])
        
        # Step 1: Create questions
        q1_resp = mentor_client.post('/api/questions/', {
            'content': '1 + 1 = ?',
            'question_type': 'SINGLE_CHOICE',
            'options': [
                {'key': 'A', 'value': '1'},
                {'key': 'B', 'value': '2'},
            ],
            'answer': 'B',
            'score': 30.0,
        }, format='json')
        assert q1_resp.status_code == status.HTTP_201_CREATED
        q1_id = q1_resp.json()['id']
        
        q2_resp = mentor_client.post('/api/questions/', {
            'content': '请简述Python的特点',
            'question_type': 'SHORT_ANSWER',
            'answer': 'Python是一种解释型、面向对象的高级编程语言',
            'score': 70.0,
        }, format='json')
        assert q2_resp.status_code == status.HTTP_201_CREATED
        q2_id = q2_resp.json()['id']
        
        # Step 2: Create quiz
        quiz_resp = mentor_client.post('/api/quizzes/', {
            'title': '综合考试',
            'description': '包含客观题和主观题',
        }, format='json')
        assert quiz_resp.status_code == status.HTTP_201_CREATED
        quiz_id = quiz_resp.json()['id']
        
        add_resp = mentor_client.post(f'/api/quizzes/{quiz_id}/add-questions/', {
            'existing_question_ids': [q1_id, q2_id]
        }, format='json')
        assert add_resp.status_code == status.HTTP_200_OK
        
        # Step 3: Create exam task (Property 27: 考试任务唯一试卷)
        start_time = timezone.now() - timedelta(hours=1)  # Started 1 hour ago
        deadline = timezone.now() + timedelta(hours=2)  # Ends in 2 hours
        
        task_resp = mentor_client.post('/api/tasks/exam/', {
            'title': '期末考试',
            'description': '请在规定时间内完成考试',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 60,  # 60 minutes
            'pass_score': 60.0,
            'quiz_id': quiz_id,
            'assignee_ids': [data['student'].id]
        }, format='json')
        assert task_resp.status_code == status.HTTP_201_CREATED
        task_id = task_resp.json()['id']
        
        # Verify initial status is PENDING_EXAM
        assignment = TaskAssignment.objects.get(task_id=task_id, assignee=data['student'])
        assignment_id = assignment.id
        assert assignment.status == 'PENDING_EXAM'
        
        # Step 4: Student starts exam (Property 28: 考试时间窗口控制)
        start_resp = student_client.post('/api/submissions/exam/start/', {
            'assignment_id': assignment_id
        }, format='json')
        assert start_resp.status_code == status.HTTP_201_CREATED
        submission_id = start_resp.json()['id']
        
        # Save answers first
        save1 = student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q1_id,
            'user_answer': 'B'
        }, format='json')
        assert save1.status_code == status.HTTP_200_OK
        
        save2 = student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q2_id,
            'user_answer': 'Python是解释型语言，易于学习'
        }, format='json')
        assert save2.status_code == status.HTTP_200_OK
        
        # Step 5: Student submits exam
        submit_resp = student_client.post(f'/api/submissions/{submission_id}/submit-exam/')
        assert submit_resp.status_code == status.HTTP_200_OK
        
        # Verify status is GRADING (Property 31: 主观题待评分状态)
        # Since there's a subjective question, status should be GRADING
        result = submit_resp.json()
        assert result['status'] == 'GRADING'
        
        # Verify submission exists
        submission = Submission.objects.get(id=submission_id)
        
        # Step 6: Mentor grades subjective question
        # First, get pending grading list
        pending_resp = mentor_client.get('/api/grading/pending/')
        assert pending_resp.status_code == status.HTTP_200_OK
        
        # Get the subjective answer ID
        subjective_answer = Answer.objects.get(
            submission=submission,
            question_id=q2_id
        )
        
        # Grade the subjective question
        grade_resp = mentor_client.post(f'/api/grading/{submission_id}/grade/', {
            'answer_id': subjective_answer.id,
            'score': 60.0,
            'comment': '回答基本正确，但不够全面'
        }, format='json')
        assert grade_resp.status_code == status.HTTP_200_OK
        
        # Step 7: Verify final status (Property 33: 评分完成状态转换)
        submission.refresh_from_db()
        assert submission.status == 'GRADED'
    
    def test_exam_only_objective_questions_auto_completes(self, setup_exam_flow):
        """
        Test exam with only objective questions auto-completes.
        
        Property 32: 纯客观题直接完成
        """
        data = setup_exam_flow
        mentor_client = get_client(data['mentor'])
        student_client = get_client(data['student'])
        
        # Create only objective questions
        q1_resp = mentor_client.post('/api/questions/', {
            'content': '2 + 2 = ?',
            'question_type': 'SINGLE_CHOICE',
            'options': [{'key': 'A', 'value': '3'}, {'key': 'B', 'value': '4'}],
            'answer': 'B',
            'score': 50.0,
        }, format='json')
        assert q1_resp.status_code == status.HTTP_201_CREATED
        q1_id = q1_resp.json()['id']
        
        q2_resp = mentor_client.post('/api/questions/', {
            'content': 'Python是编程语言',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 50.0,
        }, format='json')
        assert q2_resp.status_code == status.HTTP_201_CREATED
        q2_id = q2_resp.json()['id']
        
        # Create quiz and exam
        quiz_resp = mentor_client.post('/api/quizzes/', {
            'title': '客观题考试',
        }, format='json')
        quiz_id = quiz_resp.json()['id']
        
        mentor_client.post(f'/api/quizzes/{quiz_id}/add-questions/', {
            'existing_question_ids': [q1_id, q2_id]
        }, format='json')
        
        start_time = timezone.now() - timedelta(hours=1)
        deadline = timezone.now() + timedelta(hours=2)
        
        task_resp = mentor_client.post('/api/tasks/exam/', {
            'title': '客观题考试',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 30,
            'pass_score': 60.0,
            'quiz_id': quiz_id,
            'assignee_ids': [data['student'].id]
        }, format='json')
        task_id = task_resp.json()['id']
        assignment = TaskAssignment.objects.get(task_id=task_id, assignee=data['student'])
        assignment_id = assignment.id
        
        # Student takes exam
        start_resp = student_client.post('/api/submissions/exam/start/', {
            'assignment_id': assignment_id
        }, format='json')
        assert start_resp.status_code == status.HTTP_201_CREATED
        submission_id = start_resp.json()['id']
        
        # Save answers
        save1 = student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q1_id,
            'user_answer': 'B'
        }, format='json')
        assert save1.status_code == status.HTTP_200_OK
        
        save2 = student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q2_id,
            'user_answer': 'TRUE'
        }, format='json')
        assert save2.status_code == status.HTTP_200_OK
        
        submit_resp = student_client.post(f'/api/submissions/{submission_id}/submit-exam/')
        
        # Verify submission completed (Property 32)
        assert submit_resp.status_code == status.HTTP_200_OK
        # For pure objective questions, status should be GRADED
        assert submit_resp.json()['status'] == 'GRADED'
        
        # Verify submission is completed in database
        submission = Submission.objects.get(id=submission_id)
        assert submission.status == 'GRADED'
    
    def test_exam_single_submission_limit(self, setup_exam_flow):
        """
        Test exam allows only single submission.
        
        Property 29: 考试单次提交限制
        """
        data = setup_exam_flow
        mentor_client = get_client(data['mentor'])
        student_client = get_client(data['student'])
        
        # Create simple exam
        q_resp = mentor_client.post('/api/questions/', {
            'content': 'Test',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 100.0,
        }, format='json')
        assert q_resp.status_code == status.HTTP_201_CREATED
        q_id = q_resp.json()['id']
        
        quiz_resp = mentor_client.post('/api/quizzes/', {'title': 'Test'}, format='json')
        quiz_id = quiz_resp.json()['id']
        mentor_client.post(f'/api/quizzes/{quiz_id}/add-questions/', {
            'existing_question_ids': [q_id]
        }, format='json')
        
        start_time = timezone.now() - timedelta(hours=1)
        deadline = timezone.now() + timedelta(hours=2)
        
        task_resp = mentor_client.post('/api/tasks/exam/', {
            'title': 'Test Exam',
            'start_time': start_time.isoformat(),
            'deadline': deadline.isoformat(),
            'duration': 30,
            'pass_score': 60.0,
            'quiz_id': quiz_id,
            'assignee_ids': [data['student'].id]
        }, format='json')
        task_id = task_resp.json()['id']
        assignment = TaskAssignment.objects.get(task_id=task_id, assignee=data['student'])
        assignment_id = assignment.id
        
        # First submission
        start_resp = student_client.post('/api/submissions/exam/start/', {
            'assignment_id': assignment_id
        }, format='json')
        submission_id = start_resp.json()['id']
        
        # Save answer and submit
        student_client.post(f'/api/submissions/{submission_id}/save-answer/', {
            'question_id': q_id,
            'user_answer': 'TRUE'
        }, format='json')
        student_client.post(f'/api/submissions/{submission_id}/submit-exam/')
        
        # Try to start again - should return existing submission or fail
        # The API may return 200 with existing submission or 400
        start2_resp = student_client.post('/api/submissions/exam/start/', {
            'assignment_id': assignment_id
        }, format='json')
        # If it returns 200, it should be the same submission (already submitted)
        # The key is that student cannot create a new submission
        if start2_resp.status_code == status.HTTP_200_OK:
            # Returned existing submission - verify it's the same one
            assert start2_resp.json()['id'] == submission_id
        else:
            # Should be 400 if not allowing re-entry
            assert start2_resp.status_code == status.HTTP_400_BAD_REQUEST
