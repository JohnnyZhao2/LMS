"""
Unit tests for Questions API.

Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
Properties:
- Property 13: 被引用题目删除保护
- Property 15: 题目所有权编辑控制
"""
import pytest
from rest_framework import status

from apps.questions.models import Question
from apps.users.models import UserRole
from tests.factories import (
    UserFactory, DepartmentFactory, RoleFactory, UserRoleFactory,
    QuestionFactory, MultipleChoiceQuestionFactory,
    TrueFalseQuestionFactory, ShortAnswerQuestionFactory,
)


@pytest.fixture
def question_admin_user(db, admin_role):
    """Create an admin user for question tests."""
    user = UserFactory()
    UserRoleFactory(user=user, role=admin_role)
    return user


@pytest.fixture
def mentor_user(db, mentor_role):
    """Create a mentor user."""
    user = UserFactory()
    UserRoleFactory(user=user, role=mentor_role)
    return user


@pytest.fixture
def dept_manager_user(db, dept_manager_role):
    """Create a department manager user."""
    user = UserFactory()
    UserRoleFactory(user=user, role=dept_manager_role)
    return user


@pytest.fixture
def student_user(db, student_role):
    """Create a student user (default role)."""
    from apps.users.models import UserRole
    user = UserFactory()
    # Use get_or_create to avoid duplicate role assignment
    UserRole.objects.get_or_create(user=user, role=student_role)
    return user


@pytest.mark.django_db
class TestQuestionListCreate:
    """Tests for question list and create endpoints."""
    
    def test_list_questions_as_admin(self, api_client, admin_user):
        """Admin can list all questions."""
        api_client.force_authenticate(user=admin_user)
        
        # Create some questions
        QuestionFactory.create_batch(3, created_by=admin_user)
        
        response = api_client.get('/api/questions/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
    
    def test_list_questions_as_mentor(self, api_client, mentor_user, admin_user):
        """
        Mentor can see all questions including admin-created ones.
        
        Requirements: 5.2 - 导师或室经理查看题库时展示所有题目（包含管理员创建的题目）
        """
        api_client.force_authenticate(user=mentor_user)
        
        # Create questions by different users
        QuestionFactory.create_batch(2, created_by=mentor_user)
        QuestionFactory.create_batch(2, created_by=admin_user)
        
        response = api_client.get('/api/questions/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 4
    
    def test_list_questions_filter_by_type(self, api_client, admin_user):
        """Can filter questions by type."""
        api_client.force_authenticate(user=admin_user)
        
        QuestionFactory.create_batch(2, created_by=admin_user)
        TrueFalseQuestionFactory.create_batch(3, created_by=admin_user)
        
        response = api_client.get('/api/questions/', {'question_type': 'TRUE_FALSE'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
    
    def test_list_questions_filter_by_difficulty(self, api_client, admin_user):
        """Can filter questions by difficulty."""
        api_client.force_authenticate(user=admin_user)
        
        QuestionFactory.create_batch(2, created_by=admin_user, difficulty='EASY')
        QuestionFactory.create_batch(3, created_by=admin_user, difficulty='HARD')
        
        response = api_client.get('/api/questions/', {'difficulty': 'HARD'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
    
    def test_list_questions_search(self, api_client, admin_user):
        """Can search questions by content."""
        api_client.force_authenticate(user=admin_user)
        
        QuestionFactory(content='Python 是什么类型的语言？', created_by=admin_user)
        QuestionFactory(content='Java 的特点是什么？', created_by=admin_user)
        
        response = api_client.get('/api/questions/', {'search': 'Python'})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert 'Python' in response.data[0]['content']
    
    def test_list_questions_unauthorized(self, api_client, student_user):
        """Student cannot access question list."""
        api_client.force_authenticate(user=student_user)
        
        response = api_client.get('/api/questions/')
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_create_single_choice_question(self, api_client, mentor_user):
        """
        Mentor can create a single choice question.
        
        Requirements: 5.1 - 创建题目时存储题目内容、类型、答案和解析，并记录创建者
        """
        api_client.force_authenticate(user=mentor_user)
        
        data = {
            'content': '以下哪个是 Python 的特点？',
            'question_type': 'SINGLE_CHOICE',
            'options': [
                {'key': 'A', 'value': '静态类型'},
                {'key': 'B', 'value': '动态类型'},
                {'key': 'C', 'value': '编译型语言'},
                {'key': 'D', 'value': '强制缩进'},
            ],
            'answer': 'B',
            'explanation': 'Python 是动态类型语言',
            'score': 2.0,
            'difficulty': 'EASY',
            'tags': ['Python', '基础'],
        }
        
        response = api_client.post('/api/questions/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['content'] == data['content']
        assert response.data['question_type'] == 'SINGLE_CHOICE'
        assert response.data['answer'] == 'B'
        assert response.data['created_by'] == mentor_user.id
    
    def test_create_multiple_choice_question(self, api_client, admin_user):
        """Admin can create a multiple choice question."""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            'content': '以下哪些是编程语言？',
            'question_type': 'MULTIPLE_CHOICE',
            'options': [
                {'key': 'A', 'value': 'Python'},
                {'key': 'B', 'value': 'HTML'},
                {'key': 'C', 'value': 'Java'},
                {'key': 'D', 'value': 'CSS'},
            ],
            'answer': ['A', 'C'],
            'explanation': 'Python 和 Java 是编程语言，HTML 和 CSS 是标记语言',
        }
        
        response = api_client.post('/api/questions/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['question_type'] == 'MULTIPLE_CHOICE'
        assert set(response.data['answer']) == {'A', 'C'}
    
    def test_create_true_false_question(self, api_client, admin_user):
        """Admin can create a true/false question."""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            'content': 'Python 是解释型语言',
            'question_type': 'TRUE_FALSE',
            'answer': 'TRUE',
            'explanation': 'Python 是解释型语言，代码在运行时逐行解释执行',
        }
        
        response = api_client.post('/api/questions/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['question_type'] == 'TRUE_FALSE'
        assert response.data['answer'] == 'TRUE'
    
    def test_create_short_answer_question(self, api_client, admin_user):
        """Admin can create a short answer question."""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            'content': '请简述 Python 的 GIL 是什么？',
            'question_type': 'SHORT_ANSWER',
            'answer': 'GIL（全局解释器锁）是 Python 解释器中的一个机制...',
            'explanation': '参考答案要点：GIL 的定义、作用、影响',
        }
        
        response = api_client.post('/api/questions/', data, format='json')
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['question_type'] == 'SHORT_ANSWER'
        assert response.data['is_subjective'] is True
    
    def test_create_question_invalid_answer(self, api_client, admin_user):
        """Cannot create question with invalid answer."""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            'content': '测试题目',
            'question_type': 'SINGLE_CHOICE',
            'options': [
                {'key': 'A', 'value': '选项A'},
                {'key': 'B', 'value': '选项B'},
            ],
            'answer': 'C',  # Invalid - not in options
        }
        
        response = api_client.post('/api/questions/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_create_question_missing_options(self, api_client, admin_user):
        """Cannot create choice question without options."""
        api_client.force_authenticate(user=admin_user)
        
        data = {
            'content': '测试题目',
            'question_type': 'SINGLE_CHOICE',
            'options': [],
            'answer': 'A',
        }
        
        response = api_client.post('/api/questions/', data, format='json')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestQuestionDetail:
    """Tests for question detail, update, delete endpoints."""
    
    def test_get_question_detail(self, api_client, admin_user):
        """Can get question detail."""
        api_client.force_authenticate(user=admin_user)
        
        question = QuestionFactory(created_by=admin_user)
        
        response = api_client.get(f'/api/questions/{question.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == question.id
        assert response.data['content'] == question.content
    
    def test_get_nonexistent_question(self, api_client, admin_user):
        """Returns 400 for nonexistent question."""
        api_client.force_authenticate(user=admin_user)
        
        response = api_client.get('/api/questions/99999/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_update_own_question_as_mentor(self, api_client, mentor_user):
        """
        Mentor can update their own question.
        
        Requirements: 5.3 - 导师或室经理仅允许编辑自己创建的题目
        """
        api_client.force_authenticate(user=mentor_user)
        
        question = QuestionFactory(created_by=mentor_user)
        
        response = api_client.patch(
            f'/api/questions/{question.id}/',
            {'content': '更新后的题目内容'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['content'] == '更新后的题目内容'
    
    def test_update_others_question_as_mentor_forbidden(self, api_client, mentor_user, admin_user):
        """
        Mentor cannot update others' questions.
        
        Requirements: 5.3 - 导师或室经理仅允许编辑自己创建的题目
        Property 15: 题目所有权编辑控制
        """
        api_client.force_authenticate(user=mentor_user)
        
        question = QuestionFactory(created_by=admin_user)
        
        response = api_client.patch(
            f'/api/questions/{question.id}/',
            {'content': '尝试更新'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'PERMISSION_DENIED' in response.data.get('code', '')
    
    def test_update_any_question_as_admin(self, api_client, admin_user, mentor_user):
        """
        Admin can update any question.
        
        Requirements: 5.5 - 管理员允许编辑所有题目
        """
        api_client.force_authenticate(user=admin_user)
        
        question = QuestionFactory(created_by=mentor_user)
        
        response = api_client.patch(
            f'/api/questions/{question.id}/',
            {'content': '管理员更新的内容'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['content'] == '管理员更新的内容'
    
    def test_delete_own_question_as_mentor(self, api_client, mentor_user):
        """
        Mentor can delete their own question.
        
        Requirements: 5.4 - 导师或室经理仅允许删除自己创建的题目
        """
        api_client.force_authenticate(user=mentor_user)
        
        question = QuestionFactory(created_by=mentor_user)
        question_id = question.id
        
        response = api_client.delete(f'/api/questions/{question_id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Verify soft deleted
        question.refresh_from_db()
        assert question.is_deleted is True
    
    def test_delete_others_question_as_mentor_forbidden(self, api_client, mentor_user, admin_user):
        """
        Mentor cannot delete others' questions.
        
        Requirements: 5.4 - 导师或室经理仅允许删除自己创建的题目
        Property 15: 题目所有权编辑控制
        """
        api_client.force_authenticate(user=mentor_user)
        
        question = QuestionFactory(created_by=admin_user)
        
        response = api_client.delete(f'/api/questions/{question.id}/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'PERMISSION_DENIED' in response.data.get('code', '')
    
    def test_delete_any_question_as_admin(self, api_client, admin_user, mentor_user):
        """
        Admin can delete any question.
        
        Requirements: 5.5 - 管理员允许删除所有题目
        """
        api_client.force_authenticate(user=admin_user)
        
        question = QuestionFactory(created_by=mentor_user)
        question_id = question.id
        
        response = api_client.delete(f'/api/questions/{question_id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.django_db
class TestQuestionDeleteProtection:
    """
    Tests for question delete protection when referenced by quiz.
    
    Requirements: 5.7 - 题目被试卷引用时禁止删除
    Property 13: 被引用题目删除保护
    """
    
    def test_delete_unreferenced_question(self, api_client, admin_user):
        """Can delete question not referenced by any quiz."""
        api_client.force_authenticate(user=admin_user)
        
        question = QuestionFactory(created_by=admin_user)
        
        response = api_client.delete(f'/api/questions/{question.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Note: Test for referenced question deletion will be added after Quiz model is implemented
    # The is_referenced_by_quiz() method currently returns False as QuizQuestion model doesn't exist yet
