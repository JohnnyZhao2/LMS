"""
Property-based tests for Quiz module.

Tests the following correctness properties:
- Property 14: 被引用试卷删除保护
- Property 16: 试卷所有权编辑控制

**Feature: lms-backend**
**Validates: Requirements 6.5, 6.6, 6.7, 6.8**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.test import APIClient

from apps.quizzes.models import Quiz, QuizQuestion
from apps.questions.models import Question
from apps.tasks.models import Task, TaskQuiz
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
def valid_quiz_title_strategy(draw):
    """Generate valid quiz titles: 1-200 chars."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789中文测试试卷',
        min_size=1,
        max_size=50
    ))


@st.composite
def valid_quiz_description_strategy(draw):
    """Generate valid quiz descriptions."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789中文测试描述',
        min_size=0,
        max_size=100
    ))


@st.composite
def valid_task_title_strategy(draw):
    """Generate valid task titles: 1-200 chars."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789中文测试任务',
        min_size=1,
        max_size=50
    ))


# ============ Fixtures ============

@pytest.fixture
def setup_department(db):
    """Create a test department."""
    dept, _ = Department.objects.get_or_create(
        code='TEST_QUIZ',
        defaults={'name': '试卷测试部门', 'description': '试卷模块测试用部门'}
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
        username='quiz_admin_user',
        defaults={
            'employee_id': 'QZ_ADMIN_001',
            'username': '试卷管理员',
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
        username='quiz_mentor_user',
        defaults={
            'employee_id': 'QZ_MENTOR_001',
            'username': '试卷导师',
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
        username='quiz_mentor_user2',
        defaults={
            'employee_id': 'QZ_MENTOR_002',
            'username': '另一个试卷导师',
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

def create_quiz(title, description, created_by, unique_suffix):
    """Create a quiz for testing."""
    return Quiz.objects.create(
        title=f"{title}_{unique_suffix}",
        description=f"{description}_{unique_suffix}" if description else f"描述_{unique_suffix}",
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


class TestProperty14ReferencedQuizDeletionProtection:
    """
    **Feature: lms-backend, Property 14: 被引用试卷删除保护**
    
    *For any* 被 TaskQuiz 引用的试卷，删除操作应该返回 400 错误。
    **Validates: Requirements 6.8**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
        task_title=valid_task_title_strategy(),
    )
    def test_referenced_quiz_cannot_be_deleted(
        self,
        setup_department,
        setup_admin_user,
        quiz_title,
        quiz_description,
        task_title,
    ):
        """
        **Feature: lms-backend, Property 14: 被引用试卷删除保护**
        
        For any quiz that is referenced by a TaskQuiz,
        the delete operation should raise a ValidationError.
        
        **Validates: Requirements 6.8**
        """
        import uuid
        from django.utils import timezone
        from datetime import timedelta
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        assume(len(task_title.strip()) > 0)
        
        # Create quiz
        quiz = create_quiz(quiz_title, quiz_description, setup_admin_user, unique_suffix)
        
        # Create a task that references this quiz
        task = Task.objects.create(
            title=f"{task_title}_{unique_suffix}",
            description=f"任务描述_{unique_suffix}",
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=setup_admin_user,
        )
        
        # Create the TaskQuiz reference
        task_quiz = TaskQuiz.objects.create(
            task=task,
            quiz=quiz,
            order=1,
        )
        
        try:
            # Property assertion: deleting referenced quiz should raise ValidationError
            assert quiz.is_referenced_by_task(), \
                "Quiz should be detected as referenced by task"
            
            with pytest.raises(ValidationError) as exc_info:
                quiz.delete()
            
            # Verify the error message
            assert '已被任务引用' in str(exc_info.value) or '无法删除' in str(exc_info.value), \
                f"Expected error message about task reference, got: {exc_info.value}"
            
            # Verify quiz still exists
            assert Quiz.objects.filter(pk=quiz.pk).exists(), \
                "Quiz should still exist after failed delete"
            
        finally:
            # Cleanup - must delete in correct order due to foreign key constraints
            task_quiz.delete()
            task.delete()
            quiz.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
    )
    def test_unreferenced_quiz_can_be_deleted(
        self,
        setup_department,
        setup_admin_user,
        quiz_title,
        quiz_description,
    ):
        """
        **Feature: lms-backend, Property 14: 被引用试卷删除保护**
        
        For any quiz that is NOT referenced by any TaskQuiz,
        the delete operation should succeed.
        
        **Validates: Requirements 6.8**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        
        # Create quiz without any task reference
        quiz = create_quiz(quiz_title, quiz_description, setup_admin_user, unique_suffix)
        
        quiz_pk = quiz.pk
        
        # Property assertion: unreferenced quiz should be deletable
        assert not quiz.is_referenced_by_task(), \
            "Quiz should not be detected as referenced"
        
        # Delete should succeed without raising an exception
        quiz.delete()
        
        # Verify quiz no longer exists
        assert not Quiz.objects.filter(pk=quiz_pk).exists(), \
            "Quiz should be deleted successfully"


    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
        task_title=valid_task_title_strategy(),
    )
    def test_referenced_quiz_api_delete_returns_400(
        self,
        setup_department,
        setup_roles,
        setup_admin_user,
        quiz_title,
        quiz_description,
        task_title,
    ):
        """
        **Feature: lms-backend, Property 14: 被引用试卷删除保护**
        
        For any quiz that is referenced by a TaskQuiz,
        the API delete operation should return 400 error.
        
        **Validates: Requirements 6.8**
        """
        import uuid
        from django.utils import timezone
        from datetime import timedelta
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        assume(len(task_title.strip()) > 0)
        
        # Create quiz
        quiz = create_quiz(quiz_title, quiz_description, setup_admin_user, unique_suffix)
        
        # Create a task that references this quiz
        task = Task.objects.create(
            title=f"{task_title}_{unique_suffix}",
            description=f"任务描述_{unique_suffix}",
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=setup_admin_user,
        )
        
        # Create the TaskQuiz reference
        task_quiz = TaskQuiz.objects.create(
            task=task,
            quiz=quiz,
            order=1,
        )
        
        try:
            # Admin tries to delete referenced quiz via API
            client = get_authenticated_client(setup_admin_user, 'ADMIN')
            
            response = client.delete(f'/api/quizzes/{quiz.pk}/')
            
            # Property assertion: API should return 400 for referenced quiz
            assert response.status_code == status.HTTP_400_BAD_REQUEST, \
                f"Expected 400 Bad Request, got {response.status_code}: {response.data}"
            assert response.data.get('code') == 'RESOURCE_REFERENCED', \
                f"Expected RESOURCE_REFERENCED code, got: {response.data.get('code')}"
            
            # Verify quiz still exists
            assert Quiz.objects.filter(pk=quiz.pk, is_deleted=False).exists(), \
                "Quiz should still exist after failed API delete"
            
        finally:
            # Cleanup
            task_quiz.delete()
            task.delete()
            quiz.delete()


class TestProperty16QuizOwnershipEditControl:
    """
    **Feature: lms-backend, Property 16: 试卷所有权编辑控制**
    
    *For any* 非管理员用户对非自己创建的试卷的编辑/删除请求，应该返回 403 错误；
    管理员可以编辑/删除任意试卷。
    **Validates: Requirements 6.5, 6.6, 6.7**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
        new_title=valid_quiz_title_strategy(),
    )
    def test_mentor_cannot_edit_others_quiz(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        setup_another_mentor_user,
        quiz_title,
        quiz_description,
        new_title,
    ):
        """
        **Feature: lms-backend, Property 16: 试卷所有权编辑控制**
        
        For any mentor trying to edit a quiz created by another user,
        the edit operation should return 400 with PERMISSION_DENIED code.
        
        **Validates: Requirements 6.5**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        assume(len(new_title.strip()) > 0)
        assume(quiz_title.strip() != new_title.strip())
        
        # Create quiz by mentor1
        quiz = create_quiz(quiz_title, quiz_description, setup_mentor_user, unique_suffix)
        
        try:
            # mentor2 tries to edit mentor1's quiz via API
            client = get_authenticated_client(setup_another_mentor_user, 'MENTOR')
            
            response = client.patch(
                f'/api/quizzes/{quiz.pk}/',
                {'title': f"{new_title}_{unique_suffix}"},
                format='json'
            )
            
            # Property assertion: non-owner mentor should get 400 with PERMISSION_DENIED code
            assert response.status_code == status.HTTP_400_BAD_REQUEST, \
                f"Expected 400 Bad Request, got {response.status_code}: {response.data}"
            assert response.data.get('code') == 'PERMISSION_DENIED', \
                f"Expected PERMISSION_DENIED code, got: {response.data.get('code')}"
            
            # Verify quiz title unchanged
            quiz.refresh_from_db()
            assert quiz_title in quiz.title, \
                "Quiz title should remain unchanged"
            
        finally:
            quiz.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
    )
    def test_mentor_cannot_delete_others_quiz(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        setup_another_mentor_user,
        quiz_title,
        quiz_description,
    ):
        """
        **Feature: lms-backend, Property 16: 试卷所有权编辑控制**
        
        For any mentor trying to delete a quiz created by another user,
        the delete operation should return 400 with PERMISSION_DENIED code.
        
        **Validates: Requirements 6.6**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        
        # Create quiz by mentor1
        quiz = create_quiz(quiz_title, quiz_description, setup_mentor_user, unique_suffix)
        
        try:
            # mentor2 tries to delete mentor1's quiz via API
            client = get_authenticated_client(setup_another_mentor_user, 'MENTOR')
            
            response = client.delete(f'/api/quizzes/{quiz.pk}/')
            
            # Property assertion: non-owner mentor should get 400 with PERMISSION_DENIED code
            assert response.status_code == status.HTTP_400_BAD_REQUEST, \
                f"Expected 400 Bad Request, got {response.status_code}: {response.data}"
            assert response.data.get('code') == 'PERMISSION_DENIED', \
                f"Expected PERMISSION_DENIED code, got: {response.data.get('code')}"
            
            # Verify quiz still exists
            assert Quiz.objects.filter(pk=quiz.pk, is_deleted=False).exists(), \
                "Quiz should still exist after failed delete"
            
        finally:
            quiz.delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
        new_title=valid_quiz_title_strategy(),
    )
    def test_owner_can_edit_own_quiz(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        quiz_title,
        quiz_description,
        new_title,
    ):
        """
        **Feature: lms-backend, Property 16: 试卷所有权编辑控制**
        
        For any mentor editing their own quiz,
        the edit operation should succeed.
        
        **Validates: Requirements 6.5**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        assume(len(new_title.strip()) > 0)
        assume(quiz_title.strip() != new_title.strip())
        
        # Create quiz by mentor
        quiz = create_quiz(quiz_title, quiz_description, setup_mentor_user, unique_suffix)
        
        try:
            # Owner tries to edit their own quiz via API
            client = get_authenticated_client(setup_mentor_user, 'MENTOR')
            
            new_title_with_suffix = f"{new_title}_{unique_suffix}"
            response = client.patch(
                f'/api/quizzes/{quiz.pk}/',
                {'title': new_title_with_suffix},
                format='json'
            )
            
            # Property assertion: owner should be able to edit
            assert response.status_code == status.HTTP_200_OK, \
                f"Expected 200 OK, got {response.status_code}: {response.data}"
            
            # Verify quiz title changed
            quiz.refresh_from_db()
            assert quiz.title == new_title_with_suffix, \
                "Quiz title should be updated"
            
        finally:
            quiz.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
    )
    def test_owner_can_delete_own_quiz(
        self,
        setup_department,
        setup_roles,
        setup_mentor_user,
        quiz_title,
        quiz_description,
    ):
        """
        **Feature: lms-backend, Property 16: 试卷所有权编辑控制**
        
        For any mentor deleting their own quiz (not referenced by task),
        the delete operation should succeed.
        
        **Validates: Requirements 6.6**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        
        # Create quiz by mentor
        quiz = create_quiz(quiz_title, quiz_description, setup_mentor_user, unique_suffix)
        quiz_pk = quiz.pk
        
        # Owner tries to delete their own quiz via API
        client = get_authenticated_client(setup_mentor_user, 'MENTOR')
        
        response = client.delete(f'/api/quizzes/{quiz_pk}/')
        
        # Property assertion: owner should be able to delete
        assert response.status_code == status.HTTP_204_NO_CONTENT, \
            f"Expected 204 No Content, got {response.status_code}: {response.data if hasattr(response, 'data') else ''}"
        
        # Verify quiz is soft deleted
        assert not Quiz.objects.filter(pk=quiz_pk, is_deleted=False).exists(), \
            "Quiz should be soft deleted"
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
        new_title=valid_quiz_title_strategy(),
    )
    def test_admin_can_edit_any_quiz(
        self,
        setup_department,
        setup_roles,
        setup_admin_user,
        setup_mentor_user,
        quiz_title,
        quiz_description,
        new_title,
    ):
        """
        **Feature: lms-backend, Property 16: 试卷所有权编辑控制**
        
        For any admin editing any quiz (including those created by others),
        the edit operation should succeed.
        
        **Validates: Requirements 6.7**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        assume(len(new_title.strip()) > 0)
        assume(quiz_title.strip() != new_title.strip())
        
        # Create quiz by mentor (not admin)
        quiz = create_quiz(quiz_title, quiz_description, setup_mentor_user, unique_suffix)
        
        try:
            # Admin tries to edit mentor's quiz via API
            client = get_authenticated_client(setup_admin_user, 'ADMIN')
            
            new_title_with_suffix = f"{new_title}_{unique_suffix}"
            response = client.patch(
                f'/api/quizzes/{quiz.pk}/',
                {'title': new_title_with_suffix},
                format='json'
            )
            
            # Property assertion: admin should be able to edit any quiz
            assert response.status_code == status.HTTP_200_OK, \
                f"Expected 200 OK, got {response.status_code}: {response.data}"
            
            # Verify quiz title changed
            quiz.refresh_from_db()
            assert quiz.title == new_title_with_suffix, \
                "Quiz title should be updated by admin"
            
        finally:
            quiz.delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        quiz_title=valid_quiz_title_strategy(),
        quiz_description=valid_quiz_description_strategy(),
    )
    def test_admin_can_delete_any_quiz(
        self,
        setup_department,
        setup_roles,
        setup_admin_user,
        setup_mentor_user,
        quiz_title,
        quiz_description,
    ):
        """
        **Feature: lms-backend, Property 16: 试卷所有权编辑控制**
        
        For any admin deleting any quiz (including those created by others),
        the delete operation should succeed (if not referenced by task).
        
        **Validates: Requirements 6.7**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(quiz_title.strip()) > 0)
        
        # Create quiz by mentor (not admin)
        quiz = create_quiz(quiz_title, quiz_description, setup_mentor_user, unique_suffix)
        quiz_pk = quiz.pk
        
        # Admin tries to delete mentor's quiz via API
        client = get_authenticated_client(setup_admin_user, 'ADMIN')
        
        response = client.delete(f'/api/quizzes/{quiz_pk}/')
        
        # Property assertion: admin should be able to delete any quiz
        assert response.status_code == status.HTTP_204_NO_CONTENT, \
            f"Expected 204 No Content, got {response.status_code}: {response.data if hasattr(response, 'data') else ''}"
        
        # Verify quiz is soft deleted
        assert not Quiz.objects.filter(pk=quiz_pk, is_deleted=False).exists(), \
            "Quiz should be soft deleted by admin"
