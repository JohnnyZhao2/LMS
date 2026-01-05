"""
Property-based tests for Knowledge module.

Tests the following correctness properties:
- Property 12: 被引用知识删除保护

**Feature: lms-backend**
**Validates: Requirements 4.5**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from django.core.exceptions import ValidationError

from apps.knowledge.models import Knowledge, Tag
from apps.tasks.models import Task, TaskKnowledge
from apps.users.models import User, Department


# Suppress function-scoped fixture health check since our fixtures are
# intentionally shared across hypothesis iterations (they set up static data)
HYPOTHESIS_SETTINGS = {
    'max_examples': 100,
    'deadline': None,
    'suppress_health_check': [HealthCheck.function_scoped_fixture]
}


# ============ Strategies ============

@st.composite
def valid_knowledge_title_strategy(draw):
    """Generate valid knowledge titles: 1-200 chars."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789中文测试知识文档',
        min_size=1,
        max_size=50
    ))


@st.composite
def valid_content_strategy(draw):
    """Generate valid content for OTHER type knowledge."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789中文测试内容正文',
        min_size=10,
        max_size=200
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
        code='TEST_KNOW',
        defaults={'name': '知识测试部门', 'description': '知识模块测试用部门'}
    )
    return dept


@pytest.fixture
def setup_user(db, setup_department):
    """Create a test user for knowledge creation."""
    from apps.users.models import Role, UserRole
    
    user, created = User.objects.get_or_create(
        username='knowledge_test_user',
        defaults={
            'employee_id': 'KNOW_TEST_001',
            'username': '知识测试用户',
            'department': setup_department,
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
        
        # Ensure student role exists and is assigned
        student_role, _ = Role.objects.get_or_create(
            code='STUDENT',
            defaults={'name': '学员', 'description': '学员角色'}
        )
        UserRole.objects.get_or_create(user=user, role=student_role)
    
    return user


# ============ Property Tests ============


class TestProperty12ReferencedKnowledgeDeletionProtection:
    """
    **Feature: lms-backend, Property 12: 被引用知识删除保护**
    
    *For any* 被 TaskKnowledge 引用的知识文档，删除操作应该返回 400 错误。
    **Validates: Requirements 4.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        knowledge_title=valid_knowledge_title_strategy(),
        knowledge_content=valid_content_strategy(),
        task_title=valid_task_title_strategy(),
    )
    def test_referenced_knowledge_cannot_be_deleted(
        self,
        setup_department,
        setup_user,
        knowledge_title,
        knowledge_content,
        task_title,
    ):
        """
        **Feature: lms-backend, Property 12: 被引用知识删除保护**
        
        For any knowledge document that is referenced by a TaskKnowledge,
        the delete operation should raise a ValidationError.
        
        **Validates: Requirements 4.5**
        """
        import uuid
        from django.utils import timezone
        from datetime import timedelta
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(knowledge_title.strip()) > 0)
        assume(len(knowledge_content.strip()) > 0)
        assume(len(task_title.strip()) > 0)
        
        # Create knowledge document
        knowledge = Knowledge.objects.create(
            title=f"{knowledge_title}_{unique_suffix}",
            knowledge_type='OTHER',
            content=knowledge_content,
            summary=f"摘要_{unique_suffix}",
            created_by=setup_user,
        )
        
        # Create a task that references this knowledge
        task = Task.objects.create(
            title=f"{task_title}_{unique_suffix}",
            description=f"任务描述_{unique_suffix}",
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=setup_user,
        )
        
        # Create the TaskKnowledge reference
        task_knowledge = TaskKnowledge.objects.create(
            task=task,
            knowledge=knowledge,
            order=1,
        )
        
        try:
            # Property assertion: deleting referenced knowledge should raise ValidationError
            assert knowledge.is_referenced_by_task(), \
                "Knowledge should be detected as referenced by task"
            
            with pytest.raises(ValidationError) as exc_info:
                knowledge.delete()
            
            # Verify the error message
            assert '已被任务引用' in str(exc_info.value) or '无法删除' in str(exc_info.value), \
                f"Expected error message about task reference, got: {exc_info.value}"
            
            # Verify knowledge still exists
            assert Knowledge.objects.filter(pk=knowledge.pk).exists(), \
                "Knowledge should still exist after failed delete"
            
        finally:
            # Cleanup - must delete in correct order due to foreign key constraints
            task_knowledge.delete()
            task.delete()
            knowledge.delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        knowledge_title=valid_knowledge_title_strategy(),
        knowledge_content=valid_content_strategy(),
    )
    def test_unreferenced_knowledge_can_be_deleted(
        self,
        setup_department,
        setup_user,
        knowledge_title,
        knowledge_content,
    ):
        """
        **Feature: lms-backend, Property 12: 被引用知识删除保护**
        
        For any knowledge document that is NOT referenced by any TaskKnowledge,
        the delete operation should succeed.
        
        **Validates: Requirements 4.5**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Ensure we have valid content
        assume(len(knowledge_title.strip()) > 0)
        assume(len(knowledge_content.strip()) > 0)
        
        # Create knowledge document without any task reference
        knowledge = Knowledge.objects.create(
            title=f"{knowledge_title}_{unique_suffix}",
            knowledge_type='OTHER',
            content=knowledge_content,
            summary=f"摘要_{unique_suffix}",
            created_by=setup_user,
        )
        
        knowledge_pk = knowledge.pk
        
        # Property assertion: unreferenced knowledge should be deletable
        assert not knowledge.is_referenced_by_task(), \
            "Knowledge should not be detected as referenced"
        
        # Delete should succeed without raising an exception
        knowledge.delete()
        
        # Verify knowledge no longer exists
        assert not Knowledge.objects.filter(pk=knowledge_pk).exists(), \
            "Knowledge should be deleted successfully"

