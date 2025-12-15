"""
Integration tests for resource reference protection.

Tests the end-to-end flow:
1. Create resources (knowledge, questions, quizzes)
2. Create tasks that reference resources
3. Verify deletion protection when referenced
4. Verify deletion allowed when not referenced

Requirements: 4.5, 5.7, 6.8
Properties: 12, 13, 14
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.knowledge.models import Knowledge
from apps.questions.models import Question
from apps.quizzes.models import Quiz


@pytest.fixture
def setup_resource_protection(db):
    """Set up environment for resource protection tests."""
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


class TestKnowledgeDeletionProtection:
    """
    Tests for knowledge deletion protection.
    
    Property 12: 被引用知识删除保护
    Requirements: 4.5
    """
    
    def test_unreferenced_knowledge_can_be_deleted(self, setup_resource_protection):
        """Test knowledge not referenced by any task can be deleted."""
        data = setup_resource_protection
        admin_client = get_client(data['admin'])
        
        # Create knowledge
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '测试内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        # Delete knowledge - should succeed
        delete_resp = admin_client.delete(f'/api/knowledge/{knowledge_id}/')
        assert delete_resp.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify soft deleted - GET returns 400 (RESOURCE_NOT_FOUND via BusinessError)
        get_resp = admin_client.get(f'/api/knowledge/{knowledge_id}/')
        # Soft delete means the record exists but is_deleted=True
        # The view returns 400 with RESOURCE_NOT_FOUND code
        assert get_resp.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_referenced_knowledge_cannot_be_deleted(self, setup_resource_protection):
        """Test knowledge referenced by task cannot be deleted."""
        data = setup_resource_protection
        admin_client = get_client(data['admin'])
        mentor_client = get_client(data['mentor'])
        
        # Create knowledge
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '被引用知识',
            'knowledge_type': 'OTHER',
            'content': '测试内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        # Create task referencing the knowledge
        deadline = timezone.now() + timedelta(days=7)
        mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student'].id]
        }, format='json')
        
        # Try to delete knowledge - should fail (Property 12)
        delete_resp = admin_client.delete(f'/api/knowledge/{knowledge_id}/')
        assert delete_resp.status_code == status.HTTP_400_BAD_REQUEST
        assert delete_resp.json()['code'] == 'RESOURCE_REFERENCED'


class TestQuestionDeletionProtection:
    """
    Tests for question deletion protection.
    
    Property 13: 被引用题目删除保护
    Requirements: 5.7
    """
    
    def test_unreferenced_question_can_be_deleted(self, setup_resource_protection):
        """Test question not referenced by any quiz can be deleted."""
        data = setup_resource_protection
        mentor_client = get_client(data['mentor'])
        
        # Create question
        question_resp = mentor_client.post('/api/questions/', {
            'content': '测试题目',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 10.0,
        }, format='json')
        question_id = question_resp.json()['id']
        
        # Delete question - should succeed
        delete_resp = mentor_client.delete(f'/api/questions/{question_id}/')
        assert delete_resp.status_code == status.HTTP_204_NO_CONTENT
    
    def test_referenced_question_cannot_be_deleted(self, setup_resource_protection):
        """Test question referenced by quiz cannot be deleted."""
        data = setup_resource_protection
        mentor_client = get_client(data['mentor'])
        
        # Create question
        question_resp = mentor_client.post('/api/questions/', {
            'content': '被引用题目',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 10.0,
        }, format='json')
        assert question_resp.status_code == status.HTTP_201_CREATED
        question_id = question_resp.json()['id']
        
        # Create quiz and add question
        quiz_resp = mentor_client.post('/api/quizzes/', {
            'title': '测试试卷',
        }, format='json')
        assert quiz_resp.status_code == status.HTTP_201_CREATED
        quiz_id = quiz_resp.json()['id']
        
        add_resp = mentor_client.post(f'/api/quizzes/{quiz_id}/add-questions/', {
            'existing_question_ids': [question_id]
        }, format='json')
        assert add_resp.status_code == status.HTTP_200_OK
        
        # Verify question is in quiz
        from apps.quizzes.models import QuizQuestion
        assert QuizQuestion.objects.filter(quiz_id=quiz_id, question_id=question_id).exists()
        
        # Try to delete question - should fail (Property 13)
        delete_resp = mentor_client.delete(f'/api/questions/{question_id}/')
        assert delete_resp.status_code == status.HTTP_400_BAD_REQUEST
        assert delete_resp.json()['code'] == 'RESOURCE_REFERENCED'


class TestQuizDeletionProtection:
    """
    Tests for quiz deletion protection.
    
    Property 14: 被引用试卷删除保护
    Requirements: 6.8
    """
    
    def test_unreferenced_quiz_can_be_deleted(self, setup_resource_protection):
        """Test quiz not referenced by any task can be deleted."""
        data = setup_resource_protection
        mentor_client = get_client(data['mentor'])
        
        # Create quiz
        quiz_resp = mentor_client.post('/api/quizzes/', {
            'title': '测试试卷',
        }, format='json')
        quiz_id = quiz_resp.json()['id']
        
        # Delete quiz - should succeed
        delete_resp = mentor_client.delete(f'/api/quizzes/{quiz_id}/')
        assert delete_resp.status_code == status.HTTP_204_NO_CONTENT
    
    def test_referenced_quiz_cannot_be_deleted(self, setup_resource_protection):
        """Test quiz referenced by task cannot be deleted."""
        data = setup_resource_protection
        mentor_client = get_client(data['mentor'])
        
        # Create question and quiz
        question_resp = mentor_client.post('/api/questions/', {
            'content': '题目',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 100.0,
        }, format='json')
        question_id = question_resp.json()['id']
        
        quiz_resp = mentor_client.post('/api/quizzes/', {
            'title': '被引用试卷',
        }, format='json')
        quiz_id = quiz_resp.json()['id']
        
        mentor_client.post(f'/api/quizzes/{quiz_id}/add-questions/', {
            'existing_question_ids': [question_id]
        }, format='json')
        
        # Create practice task referencing the quiz
        deadline = timezone.now() + timedelta(days=7)
        mentor_client.post('/api/tasks/practice/', {
            'title': '练习任务',
            'deadline': deadline.isoformat(),
            'quiz_ids': [quiz_id],
            'assignee_ids': [data['student'].id]
        }, format='json')
        
        # Try to delete quiz - should fail (Property 14)
        delete_resp = mentor_client.delete(f'/api/quizzes/{quiz_id}/')
        assert delete_resp.status_code == status.HTTP_400_BAD_REQUEST
        assert delete_resp.json()['code'] == 'RESOURCE_REFERENCED'


class TestOwnershipControl:
    """
    Tests for resource ownership control.
    
    Properties 15, 16: 题目/试卷所有权编辑控制
    Requirements: 5.3-5.5, 6.5-6.7
    """
    
    def test_mentor_can_edit_own_question(self, setup_resource_protection):
        """Test mentor can edit their own question."""
        data = setup_resource_protection
        mentor_client = get_client(data['mentor'])
        
        # Create question
        question_resp = mentor_client.post('/api/questions/', {
            'content': '原始题目',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 10.0,
        }, format='json')
        question_id = question_resp.json()['id']
        
        # Edit question - should succeed
        edit_resp = mentor_client.patch(f'/api/questions/{question_id}/', {
            'content': '修改后的题目'
        }, format='json')
        assert edit_resp.status_code == status.HTTP_200_OK
        assert edit_resp.json()['content'] == '修改后的题目'
    
    def test_mentor_cannot_edit_others_question(self, setup_resource_protection):
        """Test mentor cannot edit question created by others."""
        data = setup_resource_protection
        admin_client = get_client(data['admin'])
        mentor_client = get_client(data['mentor'])
        
        # Admin creates question
        question_resp = admin_client.post('/api/questions/', {
            'content': '管理员题目',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 10.0,
        }, format='json')
        question_id = question_resp.json()['id']
        
        # Mentor tries to edit - should fail (Property 15)
        # The API returns 400 with PERMISSION_DENIED code (BusinessError)
        edit_resp = mentor_client.patch(f'/api/questions/{question_id}/', {
            'content': '尝试修改'
        }, format='json')
        # Accept either 403 or 400 with PERMISSION_DENIED
        assert edit_resp.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]
        if edit_resp.status_code == status.HTTP_400_BAD_REQUEST:
            assert edit_resp.json()['code'] == 'PERMISSION_DENIED'
    
    def test_admin_can_edit_any_question(self, setup_resource_protection):
        """Test admin can edit any question."""
        data = setup_resource_protection
        admin_client = get_client(data['admin'])
        mentor_client = get_client(data['mentor'])
        
        # Mentor creates question
        question_resp = mentor_client.post('/api/questions/', {
            'content': '导师题目',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'score': 10.0,
        }, format='json')
        question_id = question_resp.json()['id']
        
        # Admin edits - should succeed (Property 15)
        edit_resp = admin_client.patch(f'/api/questions/{question_id}/', {
            'content': '管理员修改'
        }, format='json')
        assert edit_resp.status_code == status.HTTP_200_OK
    
    def test_mentor_can_edit_own_quiz(self, setup_resource_protection):
        """Test mentor can edit their own quiz."""
        data = setup_resource_protection
        mentor_client = get_client(data['mentor'])
        
        # Create quiz
        quiz_resp = mentor_client.post('/api/quizzes/', {
            'title': '原始试卷',
        }, format='json')
        quiz_id = quiz_resp.json()['id']
        
        # Edit quiz - should succeed
        edit_resp = mentor_client.patch(f'/api/quizzes/{quiz_id}/', {
            'title': '修改后的试卷'
        }, format='json')
        assert edit_resp.status_code == status.HTTP_200_OK
        assert edit_resp.json()['title'] == '修改后的试卷'
    
    def test_mentor_cannot_edit_others_quiz(self, setup_resource_protection):
        """Test mentor cannot edit quiz created by others."""
        data = setup_resource_protection
        admin_client = get_client(data['admin'])
        mentor_client = get_client(data['mentor'])
        
        # Admin creates quiz
        quiz_resp = admin_client.post('/api/quizzes/', {
            'title': '管理员试卷',
        }, format='json')
        quiz_id = quiz_resp.json()['id']
        
        # Mentor tries to edit - should fail (Property 16)
        # The API returns 400 with PERMISSION_DENIED code (BusinessError)
        edit_resp = mentor_client.patch(f'/api/quizzes/{quiz_id}/', {
            'title': '尝试修改'
        }, format='json')
        # Accept either 403 or 400 with PERMISSION_DENIED
        assert edit_resp.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_400_BAD_REQUEST]
        if edit_resp.status_code == status.HTTP_400_BAD_REQUEST:
            assert edit_resp.json()['code'] == 'PERMISSION_DENIED'
