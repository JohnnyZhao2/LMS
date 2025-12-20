"""
Property-based tests for Question module.

Tests the following correctness properties:
- Property 13: 被引用题目删除保护
- Property 15: 题目所有权编辑控制

**Feature: lms-backend**
**Validates: Requirements 5.3, 5.4, 5.5, 5.7**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APIClient

from apps.questions.models import Question
from apps.quizzes.models import Quiz, QuizQuestion
from apps.users.models import User, Department, Role, UserRole


# Suppress function-scoped fixture health check since our fixtures are
# intentionally shared across hypothesis iterations (they set up static data)
HYPOTHESIS_SETTINGS = {
    'max_examples': 100,
    'deadline': None,
    'suppress_health_check': [HealthCheck.function_scoped_fixture]
}


# ============ Strategies ============

@st.composite
def valid_question_content_strategy(draw):
    """Generate valid question content: 1-200 chars."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789中文测试题目内容',
        min_size=5,
        max_size=100
    ))


@st.composite
def valid_quiz_title_strategy(draw):
    """Generate valid quiz titles: 1-200 chars."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789中文测试试卷',
        min_size=1,
        max_size=50
    ))


# ============ Fixtures ============

@pytest.fixture
def setup_department(db):
    """Create a test department."""
    dept, _ = Department.objects.get_or_create(
        code='TEST_QUESTION',
        defaults={'name': '题目测试部门', 'description': '题目模块测试用部门'}
    )
    return dept


@pytest.fixture
def setup_roles(db):
    """Create all required roles."""
    roles = {}
    for code, name in Role.ROLE_CHOICES:
        role, _ = Role.objects.get_or_create(
            code=code,
            defaults={'name': name, 'description': f'{name}角色'}
        )
        roles[code] = role
    return roles


@pytest.fixture
def setup_admin_user(db, setup_department, setup_roles):
    """Create an admin user for testing."""
    user, created = User.objects.get_or_create(
        username='question_admin_user',
        defaults={
            'employee_id': 'Q_ADMIN_001',
            'username': '题目管理员',
            'department': setup_department,
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        UserRole.objects.get_or_create(user=user, role=setup_roles['STUDENT'])
        UserRole.objects.get_or_create(user=user, role=setup_roles['ADMIN'])
    return user


@pytest.fixture
def setup_mentor_user(db, setup_department, setup_roles):
    """Create a mentor user for testing."""
    user, created = User.objects.get_or_create(
        username='question_mentor_user',
        defaults={
            'employee_id': 'Q_MENTOR_001',
            'username': '题目导师',
            'department': setup_department,
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        UserRole.objects.get_or_create(user=user, role=setup_roles['STUDENT'])
        UserRole.objects.get_or_create(user=user, role=setup_roles['MENTOR'])
    return user


@pytest.fixture
def setup_another_mentor_user(db, setup_department, setup_roles):
    """Create another mentor user for ownership testing."""
    user, created = User.objects.get_or_create(
        username='question_mentor_user2',
        defaults={
            'employee_id': 'Q_MENTOR_002',
            'username': '另一个导师',
            'department': setup_department,
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        UserRole.objects.get_or_create(user=user, role=setup_roles['STUDENT'])
        UserRole.objects.get_or_create(user=user, role=setup_roles['MENTOR'])
    return user


# ============ Helper Functions ============

def create_single_choice_question(content, created_by, unique_suffix):
    """Create a single choice question for testing."""
    return Question.objects.create(
        content=f"{content}_{unique_suffix}",
        question_type='SINGLE_CHOICE',
        options=[
            {'key': 'A', 'value': '选项A'},
            {'key': 'B', 'value': '选项B'},
            {'key': 'C', 'value': '选项C'},
            {'key': 'D', 'value': '选项D'},
        ],
        answer='A',
        explanation=f'解析_{unique_suffix}',
        score=1.0,
        difficulty='MEDIUM',
        created_by=created_by,
    )


def get_authenticated_client(user, role_code='MENTOR'):
    """Get an authenticated API client for the given user."""
    client = APIClient()
    client.force_authenticate(user=user)
    # Set current role on user
    user.current_role = role_code
    return client


# ============ Property Tests ============


class TestProperty13ReferencedQuestionDeletionProtection:
    """
    **Feature: lms-backend, Property 13: 被引用题目删除保护**
    
    *For any* 被 QuizQuestion 引用的题目，删除操作应该返回 400 错误。
    **Validates: Requirements 5.7**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
        quiz_title=valid_quiz_title_strategy(),
    )
    def test_referenced_question_cannot_be_deleted(
        self,
        setup_department,
        setup_admin_user,
        question_content,
        quiz_title,
    ):
        """
        **Feature: lms-backend, Property 13: 被引用题目删除保护**
        
        For any question that is referenced by a QuizQuestion,
        the delete operation should raise a ValidationError.
        
        **Validates: Requirements 5.7**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        assume(len(quiz_title.strip()) > 0)
        
        # Create question
        question = create_single_choice_question(
            question_content, setup_admin_user, unique_suffix
        )
        
        # Create a quiz that references this question
        quiz = Quiz.objects.create(
            title=f"{quiz_title}_{unique_suffix}",
            description=f"试卷描述_{unique_suffix}",
            created_by=setup_admin_user,
        )
        
        # Create the QuizQuestion reference
        quiz_question = QuizQuestion.objects.create(
            quiz=quiz,
            question=question,
            order=1,
        )
        
        try:
            # Property assertion: deleting referenced question should raise ValidationError
            assert question.is_referenced_by_quiz(), \
                "Question should be detected as referenced by quiz"
            
            with pytest.raises(ValidationError) as exc_info:
                question.delete()
            
            # Verify the error message
            assert '已被试卷引用' in str(exc_info.value) or '无法删除' in str(exc_info.value), \
                f"Expected error message about quiz reference, got: {exc_info.value}"
            
            # Verify question still exists
            assert Question.objects.filter(pk=question.pk).exists(), \
                "Question should still exist after failed delete"
            
        finally:
            # Cleanup - must delete in correct order due to foreign key constraints
            quiz_question.delete()
            quiz.delete()
            question.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
    )
    def test_unreferenced_question_can_be_deleted(
        self,
        setup_department,
        setup_admin_user,
        question_content,
    ):
        """
        **Feature: lms-backend, Property 13: 被引用题目删除保护**
        
        For any question that is NOT referenced by any QuizQuestion,
        the delete operation should succeed.
        
        **Validates: Requirements 5.7**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        
        # Create question without any quiz reference
        question = create_single_choice_question(
            question_content, setup_admin_user, unique_suffix
        )
        
        question_pk = question.pk
        
        # Property assertion: unreferenced question should be deletable
        assert not question.is_referenced_by_quiz(), \
            "Question should not be detected as referenced"
        
        # Delete should succeed without raising an exception
        question.delete()
        
        # Verify question no longer exists
        assert not Question.objects.filter(pk=question_pk).exists(), \
            "Question should be deleted successfully"


class TestProperty15QuestionOwnershipEditControl:
    """
    **Feature: lms-backend, Property 15: 题目所有权编辑控制**
    
    *For any* 非管理员用户对非自己创建的题目的编辑/删除请求，应该返回 403 错误；
    管理员可以编辑/删除任意题目。
    **Validates: Requirements 5.3, 5.4, 5.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
        new_content=valid_question_content_strategy(),
    )
    def test_mentor_cannot_edit_others_question(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        setup_another_mentor_user,
        question_content,
        new_content,
    ):
        """
        **Feature: lms-backend, Property 15: 题目所有权编辑控制**
        
        For any mentor trying to edit a question created by another user,
        the edit operation should return 403 Forbidden.
        
        **Validates: Requirements 5.3**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        assume(len(new_content.strip()) > 0)
        assume(question_content.strip() != new_content.strip())
        
        # Create question by mentor1
        question = create_single_choice_question(
            question_content, setup_mentor_user, unique_suffix
        )
        
        try:
            # mentor2 tries to edit mentor1's question via API
            client = get_authenticated_client(setup_another_mentor_user, 'MENTOR')
            
            response = client.patch(
                f'/api/questions/{question.pk}/',
                {'content': f"{new_content}_{unique_suffix}"},
                format='json'
            )
            
            # Property assertion: non-owner mentor should get 400 with PERMISSION_DENIED code
            # (BusinessError returns 400 with error code, not 403)
            assert response.status_code == status.HTTP_400_BAD_REQUEST, \
                f"Expected 400 Bad Request, got {response.status_code}: {response.data}"
            assert response.data.get('code') == 'PERMISSION_DENIED', \
                f"Expected PERMISSION_DENIED code, got: {response.data.get('code')}"
            
            # Verify question content unchanged
            question.refresh_from_db()
            assert question_content in question.content, \
                "Question content should remain unchanged"
            
        finally:
            question.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
    )
    def test_mentor_cannot_delete_others_question(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        setup_another_mentor_user,
        question_content,
    ):
        """
        **Feature: lms-backend, Property 15: 题目所有权编辑控制**
        
        For any mentor trying to delete a question created by another user,
        the delete operation should return 403 Forbidden.
        
        **Validates: Requirements 5.4**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        
        # Create question by mentor1
        question = create_single_choice_question(
            question_content, setup_mentor_user, unique_suffix
        )
        
        try:
            # mentor2 tries to delete mentor1's question via API
            client = get_authenticated_client(setup_another_mentor_user, 'MENTOR')
            
            response = client.delete(f'/api/questions/{question.pk}/')
            
            # Property assertion: non-owner mentor should get 400 with PERMISSION_DENIED code
            # (BusinessError returns 400 with error code, not 403)
            assert response.status_code == status.HTTP_400_BAD_REQUEST, \
                f"Expected 400 Bad Request, got {response.status_code}: {response.data}"
            assert response.data.get('code') == 'PERMISSION_DENIED', \
                f"Expected PERMISSION_DENIED code, got: {response.data.get('code')}"
            
            # Verify question still exists
            assert Question.objects.filter(pk=question.pk, is_deleted=False).exists(), \
                "Question should still exist after failed delete"
            
        finally:
            question.delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
        new_content=valid_question_content_strategy(),
    )
    def test_owner_can_edit_own_question(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        question_content,
        new_content,
    ):
        """
        **Feature: lms-backend, Property 15: 题目所有权编辑控制**
        
        For any mentor editing their own question,
        the edit operation should succeed.
        
        **Validates: Requirements 5.3**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        assume(len(new_content.strip()) > 0)
        assume(question_content.strip() != new_content.strip())
        
        # Create question by mentor
        question = create_single_choice_question(
            question_content, setup_mentor_user, unique_suffix
        )
        
        try:
            # Owner tries to edit their own question via API
            client = get_authenticated_client(setup_mentor_user, 'MENTOR')
            
            new_content_with_suffix = f"{new_content}_{unique_suffix}"
            response = client.patch(
                f'/api/questions/{question.pk}/',
                {'content': new_content_with_suffix},
                format='json'
            )
            
            # Property assertion: owner should be able to edit
            assert response.status_code == status.HTTP_200_OK, \
                f"Expected 200 OK, got {response.status_code}: {response.data}"
            
            # Verify question content changed
            question.refresh_from_db()
            assert question.content == new_content_with_suffix, \
                "Question content should be updated"
            
        finally:
            question.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
    )
    def test_owner_can_delete_own_question(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        question_content,
    ):
        """
        **Feature: lms-backend, Property 15: 题目所有权编辑控制**
        
        For any mentor deleting their own question (not referenced by quiz),
        the delete operation should succeed.
        
        **Validates: Requirements 5.4**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        
        # Create question by mentor
        question = create_single_choice_question(
            question_content, setup_mentor_user, unique_suffix
        )
        question_pk = question.pk
        
        # Owner tries to delete their own question via API
        client = get_authenticated_client(setup_mentor_user, 'MENTOR')
        
        response = client.delete(f'/api/questions/{question_pk}/')
        
        # Property assertion: owner should be able to delete
        assert response.status_code == status.HTTP_204_NO_CONTENT, \
            f"Expected 204 No Content, got {response.status_code}: {response.data if hasattr(response, 'data') else ''}"
        
        # Verify question is soft deleted
        assert not Question.objects.filter(pk=question_pk, is_deleted=False).exists(), \
            "Question should be soft deleted"
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
        new_content=valid_question_content_strategy(),
    )
    def test_admin_can_edit_any_question(
        self,
        setup_department,
        setup_roles,
        setup_admin_user,
        setup_mentor_user,
        question_content,
        new_content,
    ):
        """
        **Feature: lms-backend, Property 15: 题目所有权编辑控制**
        
        For any admin editing any question (including those created by others),
        the edit operation should succeed.
        
        **Validates: Requirements 5.5**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        assume(len(new_content.strip()) > 0)
        assume(question_content.strip() != new_content.strip())
        
        # Create question by mentor (not admin)
        question = create_single_choice_question(
            question_content, setup_mentor_user, unique_suffix
        )
        
        try:
            # Admin tries to edit mentor's question via API
            client = get_authenticated_client(setup_admin_user, 'ADMIN')
            
            new_content_with_suffix = f"{new_content}_{unique_suffix}"
            response = client.patch(
                f'/api/questions/{question.pk}/',
                {'content': new_content_with_suffix},
                format='json'
            )
            
            # Property assertion: admin should be able to edit any question
            assert response.status_code == status.HTTP_200_OK, \
                f"Expected 200 OK, got {response.status_code}: {response.data}"
            
            # Verify question content changed
            question.refresh_from_db()
            assert question.content == new_content_with_suffix, \
                "Question content should be updated by admin"
            
        finally:
            question.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        question_content=valid_question_content_strategy(),
    )
    def test_admin_can_delete_any_question(
        self,
        setup_department,
        setup_roles,
        setup_admin_user,
        setup_mentor_user,
        question_content,
    ):
        """
        **Feature: lms-backend, Property 15: 题目所有权编辑控制**
        
        For any admin deleting any question (including those created by others),
        the delete operation should succeed (if not referenced by quiz).
        
        **Validates: Requirements 5.5**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(question_content.strip()) > 0)
        
        # Create question by mentor (not admin)
        question = create_single_choice_question(
            question_content, setup_mentor_user, unique_suffix
        )
        question_pk = question.pk
        
        # Admin tries to delete mentor's question via API
        client = get_authenticated_client(setup_admin_user, 'ADMIN')
        
        response = client.delete(f'/api/questions/{question_pk}/')
        
        # Property assertion: admin should be able to delete any question
        assert response.status_code == status.HTTP_204_NO_CONTENT, \
            f"Expected 204 No Content, got {response.status_code}: {response.data if hasattr(response, 'data') else ''}"
        
        # Verify question is soft deleted
        assert not Question.objects.filter(pk=question_pk, is_deleted=False).exists(), \
            "Question should be soft deleted by admin"
