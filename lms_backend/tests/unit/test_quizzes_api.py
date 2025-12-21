"""
Tests for quiz management API.

Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8
Properties:
- Property 14: 被引用试卷删除保护
- Property 16: 试卷所有权编辑控制
"""
import pytest
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import UserRole
from apps.quizzes.models import Quiz, QuizQuestion
from apps.questions.models import Question
from tests.factories import (
    UserFactory, QuizFactory, QuestionFactory, QuizQuestionFactory,
    RoleFactory, DepartmentFactory
)


@pytest.fixture
def mentor_user(db):
    """Create a mentor user."""
    dept = DepartmentFactory()
    user = UserFactory(department=dept)
    mentor_role = RoleFactory(code='MENTOR', name='导师')
    UserRole.objects.create(user=user, role=mentor_role)
    return user


@pytest.fixture
def mentor_client(api_client, mentor_user):
    """Return an authenticated API client with mentor privileges."""
    refresh = RefreshToken.for_user(mentor_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = mentor_user
    return api_client


@pytest.fixture
def dept_manager_user(db):
    """Create a department manager user."""
    dept = DepartmentFactory()
    user = UserFactory(department=dept)
    dm_role = RoleFactory(code='DEPT_MANAGER', name='室经理')
    UserRole.objects.create(user=user, role=dm_role)
    return user


@pytest.fixture
def dept_manager_client(api_client, dept_manager_user):
    """Return an authenticated API client with dept manager privileges."""
    refresh = RefreshToken.for_user(dept_manager_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = dept_manager_user
    return api_client


@pytest.mark.django_db
class TestQuizListCreate:
    """Tests for quiz list and create endpoints."""
    
    def test_list_quizzes_as_mentor(self, mentor_client):
        """Test that mentors can list all quizzes (Req 6.4)."""
        # Create quizzes by different users
        quiz1 = QuizFactory(created_by=mentor_client.user)
        quiz2 = QuizFactory()  # Created by another user
        
        response = mentor_client.get('/api/quizzes/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
    
    def test_list_quizzes_with_search(self, mentor_client):
        """Test quiz list with search filter."""
        QuizFactory(title='Python基础测试', created_by=mentor_client.user)
        QuizFactory(title='Java进阶测试', created_by=mentor_client.user)
        
        response = mentor_client.get('/api/quizzes/', {'search': 'Python'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert 'Python' in response.data[0]['title']
    
    def test_create_quiz_as_mentor(self, mentor_client):
        """Test that mentors can create quizzes (Req 6.1)."""
        data = {
            'title': '新建试卷',
            'description': '试卷描述'
        }
        
        response = mentor_client.post('/api/quizzes/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == '新建试卷'
        assert response.data['created_by'] == mentor_client.user.id
    
    def test_create_quiz_as_admin(self, admin_client):
        """Test that admins can create quizzes (Req 6.7)."""
        data = {
            'title': '管理员创建的试卷',
            'description': '标准试卷'
        }
        
        response = admin_client.post('/api/quizzes/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['title'] == '管理员创建的试卷'



@pytest.mark.django_db
class TestQuizDetail:
    """Tests for quiz detail, update, delete endpoints."""
    
    def test_get_quiz_detail(self, mentor_client):
        """Test getting quiz detail with questions."""
        quiz = QuizFactory(created_by=mentor_client.user)
        question = QuestionFactory(created_by=mentor_client.user)
        QuizQuestionFactory(quiz=quiz, question=question, order=1)
        
        response = mentor_client.get(f'/api/quizzes/{quiz.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == quiz.title
        assert response.data['question_count'] == 1
        assert len(response.data['questions']) == 1
    
    def test_update_own_quiz_as_mentor(self, mentor_client):
        """Test that mentors can update their own quizzes (Req 6.5)."""
        quiz = QuizFactory(created_by=mentor_client.user)
        
        response = mentor_client.patch(
            f'/api/quizzes/{quiz.id}/',
            {'title': '更新后的标题'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == '更新后的标题'
    
    def test_cannot_update_others_quiz_as_mentor(self, mentor_client):
        """Test that mentors cannot update others' quizzes (Req 6.5, Property 16)."""
        other_user = UserFactory()
        quiz = QuizFactory(created_by=other_user)
        
        response = mentor_client.patch(
            f'/api/quizzes/{quiz.id}/',
            {'title': '尝试更新'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'PERMISSION_DENIED' in response.data.get('code', '')
    
    def test_admin_can_update_any_quiz(self, admin_client):
        """Test that admins can update any quiz (Req 6.7)."""
        other_user = UserFactory()
        quiz = QuizFactory(created_by=other_user)
        
        response = admin_client.patch(
            f'/api/quizzes/{quiz.id}/',
            {'title': '管理员更新'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == '管理员更新'
    
    def test_delete_own_quiz_as_mentor(self, mentor_client):
        """Test that mentors can delete their own quizzes (Req 6.6)."""
        quiz = QuizFactory(created_by=mentor_client.user)
        
        response = mentor_client.delete(f'/api/quizzes/{quiz.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        quiz.refresh_from_db()
        assert quiz.is_deleted is True
    
    def test_cannot_delete_others_quiz_as_mentor(self, mentor_client):
        """Test that mentors cannot delete others' quizzes (Req 6.6, Property 16)."""
        other_user = UserFactory()
        quiz = QuizFactory(created_by=other_user)
        
        response = mentor_client.delete(f'/api/quizzes/{quiz.id}/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'PERMISSION_DENIED' in response.data.get('code', '')



@pytest.mark.django_db
class TestQuizAddQuestions:
    """Tests for adding questions to quizzes."""
    
    def test_add_existing_questions(self, mentor_client):
        """Test adding existing questions to quiz (Req 6.2)."""
        quiz = QuizFactory(created_by=mentor_client.user)
        q1 = QuestionFactory(created_by=mentor_client.user)
        q2 = QuestionFactory(created_by=mentor_client.user)
        
        response = mentor_client.post(
            f'/api/quizzes/{quiz.id}/add-questions/',
            {'existing_question_ids': [q1.id, q2.id]},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['question_count'] == 2
    
    def test_add_new_question(self, mentor_client):
        """Test adding new question to quiz (Req 6.2, 6.3)."""
        quiz = QuizFactory(created_by=mentor_client.user)
        
        response = mentor_client.post(
            f'/api/quizzes/{quiz.id}/add-questions/',
            {
                'new_questions': [{
                    'content': '新建的题目内容',
                    'question_type': 'SINGLE_CHOICE',
                    'options': [
                        {'key': 'A', 'value': '选项A'},
                        {'key': 'B', 'value': '选项B'},
                    ],
                    'answer': 'A'
                }]
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['question_count'] == 1
        
        # Verify question was created in question bank
        assert Question.objects.filter(content='新建的题目内容').exists()
        new_question = Question.objects.get(content='新建的题目内容')
        assert new_question.created_by == mentor_client.user
    
    def test_add_mixed_questions(self, mentor_client):
        """Test adding both existing and new questions (Req 6.2, 6.3)."""
        quiz = QuizFactory(created_by=mentor_client.user)
        existing_q = QuestionFactory(created_by=mentor_client.user)
        
        response = mentor_client.post(
            f'/api/quizzes/{quiz.id}/add-questions/',
            {
                'existing_question_ids': [existing_q.id],
                'new_questions': [{
                    'content': '另一道新题目',
                    'question_type': 'TRUE_FALSE',
                    'answer': 'TRUE'
                }]
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['question_count'] == 2
    
    def test_cannot_add_questions_to_others_quiz(self, mentor_client):
        """Test that mentors cannot add questions to others' quizzes."""
        other_user = UserFactory()
        quiz = QuizFactory(created_by=other_user)
        question = QuestionFactory(created_by=mentor_client.user)
        
        response = mentor_client.post(
            f'/api/quizzes/{quiz.id}/add-questions/',
            {'existing_question_ids': [question.id]},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST



@pytest.mark.django_db
class TestQuizRemoveQuestions:
    """Tests for removing questions from quizzes."""
    
    def test_remove_questions(self, mentor_client):
        """Test removing questions from quiz."""
        quiz = QuizFactory(created_by=mentor_client.user)
        q1 = QuestionFactory(created_by=mentor_client.user)
        q2 = QuestionFactory(created_by=mentor_client.user)
        QuizQuestionFactory(quiz=quiz, question=q1, order=1)
        QuizQuestionFactory(quiz=quiz, question=q2, order=2)
        
        response = mentor_client.post(
            f'/api/quizzes/{quiz.id}/remove-questions/',
            {'question_ids': [q1.id]},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['question_count'] == 1


@pytest.mark.django_db
class TestQuizReorderQuestions:
    """Tests for reordering questions in quizzes."""
    
    def test_reorder_questions(self, mentor_client):
        """Test reordering questions in quiz."""
        quiz = QuizFactory(created_by=mentor_client.user)
        q1 = QuestionFactory(created_by=mentor_client.user)
        q2 = QuestionFactory(created_by=mentor_client.user)
        q3 = QuestionFactory(created_by=mentor_client.user)
        QuizQuestionFactory(quiz=quiz, question=q1, order=1)
        QuizQuestionFactory(quiz=quiz, question=q2, order=2)
        QuizQuestionFactory(quiz=quiz, question=q3, order=3)
        
        # Reorder: q3, q1, q2
        response = mentor_client.post(
            f'/api/quizzes/{quiz.id}/reorder-questions/',
            {'question_ids': [q3.id, q1.id, q2.id]},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        updated_quiz = Quiz.objects.get(id=response.data['id'])
        # Verify new order
        quiz_questions = list(updated_quiz.get_ordered_questions())
        assert quiz_questions[0].question_id == q3.id
        assert quiz_questions[1].question_id == q1.id
        assert quiz_questions[2].question_id == q2.id
