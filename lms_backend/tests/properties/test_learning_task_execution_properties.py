"""
Property-based tests for Learning Task Execution.

Tests the following correctness properties:
- Property 20: 知识学习完成记录
- Property 21: 学习任务自动完成
- Property 22: 知识浏览不影响任务
- Property 23: 任务逾期状态标记

**Feature: lms-backend**
**Validates: Requirements 8.3, 8.5, 8.6, 8.7**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from datetime import timedelta
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.tasks.models import Task, TaskAssignment, TaskKnowledge, KnowledgeLearningProgress
from apps.knowledge.models import Knowledge


# Suppress function-scoped fixture health check since our fixtures are
# intentionally shared across hypothesis iterations (they set up static data)
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
    
    # Add current_role to the token if specified
    if role_code:
        refresh['current_role'] = role_code
        user.current_role = role_code
    
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    client.user = user
    return client


# ============ Property Tests ============


class TestProperty20KnowledgeLearningCompletionRecord:
    """
    **Feature: lms-backend, Property 20: 知识学习完成记录**
    
    *For any* 知识学习完成操作，应该记录 completed_at 时间戳。
    **Validates: Requirements 8.3**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=1, max_value=5),
        knowledge_index=st.integers(min_value=0, max_value=100),
    )
    def test_knowledge_learning_completion_records_timestamp(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
        knowledge_index,
    ):
        """
        **Feature: lms-backend, Property 20: 知识学习完成记录**
        
        For any knowledge learning completion operation, the system should
        record the completed_at timestamp.
        
        **Validates: Requirements 8.3**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Ensure knowledge_index is within valid range
        actual_index = knowledge_index % num_knowledge
        
        # Create admin to create task
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create learning task via API
            admin_client = get_authenticated_client(admin, 'ADMIN')
            data = {
                'title': f'学习任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'knowledge_ids': [k.id for k in knowledge_items],
                'assignee_ids': [student.id],
            }
            response = admin_client.post('/api/tasks/learning/', data, format='json')
            assert response.status_code == 201, f"Task creation failed: {response.data}"
            
            task_id = response.data['id']
            
            # Get the assignment
            assignment = TaskAssignment.objects.get(task_id=task_id, assignee=student)
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # First, view the task to ensure progress records are created
            response = student_client.get(f'/api/tasks/{task_id}/learning-detail/')
            assert response.status_code == 200, f"View task failed: {response.status_code}"
            
            # Select a knowledge to complete
            target_knowledge = knowledge_items[actual_index]
            
            # Record time before completion
            time_before = timezone.now()
            
            # Complete the knowledge learning
            response = student_client.post(
                f'/api/tasks/{task_id}/complete-knowledge/',
                {'knowledge_id': target_knowledge.id},
                format='json'
            )
            
            # Record time after completion
            time_after = timezone.now()
            
            assert response.status_code == 200, f"Complete knowledge failed: {response.data}"
            
            # Property assertion: completed_at should be recorded
            progress = KnowledgeLearningProgress.objects.get(
                assignment=assignment,
                task_knowledge__knowledge=target_knowledge
            )
            
            assert progress.is_completed is True, \
                "Knowledge should be marked as completed"
            
            assert progress.completed_at is not None, \
                "completed_at timestamp should be recorded"
            
            # Verify timestamp is within expected range
            assert time_before <= progress.completed_at <= time_after, \
                f"completed_at ({progress.completed_at}) should be between {time_before} and {time_after}"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


class TestProperty21LearningTaskAutoCompletion:
    """
    **Feature: lms-backend, Property 21: 学习任务自动完成**
    
    *For any* 学习任务，当所有关联知识的学习状态都为已完成时，TaskAssignment 状态应该自动变为 COMPLETED。
    **Validates: Requirements 8.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=1, max_value=5),
    )
    def test_learning_task_auto_completes_when_all_knowledge_completed(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
    ):
        """
        **Feature: lms-backend, Property 21: 学习任务自动完成**
        
        For any learning task, when all associated knowledge items are marked
        as completed, the TaskAssignment status should automatically change
        to COMPLETED.
        
        **Validates: Requirements 8.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create learning task via API
            admin_client = get_authenticated_client(admin, 'ADMIN')
            data = {
                'title': f'学习任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'knowledge_ids': [k.id for k in knowledge_items],
                'assignee_ids': [student.id],
            }
            response = admin_client.post('/api/tasks/learning/', data, format='json')
            assert response.status_code == 201
            
            task_id = response.data['id']
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # First, view the task to ensure progress records are created
            response = student_client.get(f'/api/tasks/{task_id}/learning-detail/')
            assert response.status_code == 200, f"View task failed: {response.status_code}"
            
            # Complete all knowledge items except the last one
            for i, knowledge in enumerate(knowledge_items[:-1]):
                response = student_client.post(
                    f'/api/tasks/{task_id}/complete-knowledge/',
                    {'knowledge_id': knowledge.id},
                    format='json'
                )
                assert response.status_code == 200
                
                # Verify task is NOT completed yet
                assignment = TaskAssignment.objects.get(task_id=task_id, assignee=student)
                assert assignment.status == 'IN_PROGRESS', \
                    f"Task should still be IN_PROGRESS after completing {i+1}/{num_knowledge} knowledge items"
            
            # Complete the last knowledge item
            last_knowledge = knowledge_items[-1]
            response = student_client.post(
                f'/api/tasks/{task_id}/complete-knowledge/',
                {'knowledge_id': last_knowledge.id},
                format='json'
            )
            assert response.status_code == 200
            
            # Property assertion: Task should now be COMPLETED
            assignment = TaskAssignment.objects.get(task_id=task_id, assignee=student)
            assert assignment.status == 'COMPLETED', \
                f"Task should be COMPLETED after all knowledge items are completed, got {assignment.status}"
            
            assert assignment.completed_at is not None, \
                "completed_at should be set when task is completed"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


class TestProperty22KnowledgeBrowsingDoesNotAffectTask:
    """
    **Feature: lms-backend, Property 22: 知识浏览不影响任务**
    
    *For any* 从知识中心直接浏览知识的操作，不应该改变任何 TaskAssignment 的状态。
    **Validates: Requirements 8.6**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=1, max_value=3),
        browse_count=st.integers(min_value=1, max_value=5),
    )
    def test_knowledge_browsing_does_not_affect_task_status(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
        browse_count,
    ):
        """
        **Feature: lms-backend, Property 22: 知识浏览不影响任务**
        
        For any knowledge browsing operation from the knowledge center,
        the TaskAssignment status should not change.
        
        **Validates: Requirements 8.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create learning task via API
            admin_client = get_authenticated_client(admin, 'ADMIN')
            data = {
                'title': f'学习任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'knowledge_ids': [k.id for k in knowledge_items],
                'assignee_ids': [student.id],
            }
            response = admin_client.post('/api/tasks/learning/', data, format='json')
            assert response.status_code == 201
            
            task_id = response.data['id']
            
            # Get initial assignment status
            assignment = TaskAssignment.objects.get(task_id=task_id, assignee=student)
            initial_status = assignment.status
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Browse knowledge documents from knowledge center (not through task)
            for _ in range(browse_count):
                for knowledge in knowledge_items:
                    # View knowledge detail via knowledge center API
                    response = student_client.get(f'/api/knowledge/{knowledge.id}/')
                    assert response.status_code == 200
                    
                    # Optionally increment view count
                    response = student_client.post(f'/api/knowledge/{knowledge.id}/view/')
                    assert response.status_code == 200
            
            # Property assertion: Task status should NOT change
            assignment.refresh_from_db()
            assert assignment.status == initial_status, \
                f"Task status should remain {initial_status} after browsing knowledge, got {assignment.status}"
            
            # Verify no knowledge progress was created or updated
            progress_count = KnowledgeLearningProgress.objects.filter(
                assignment=assignment,
                is_completed=True
            ).count()
            assert progress_count == 0, \
                f"No knowledge should be marked as completed from browsing, but {progress_count} are completed"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=2, max_value=4),
    )
    def test_partial_task_completion_not_affected_by_browsing(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
    ):
        """
        **Feature: lms-backend, Property 22: 知识浏览不影响任务**
        
        For a partially completed learning task, browsing knowledge from
        the knowledge center should not affect the completion status.
        
        **Validates: Requirements 8.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create learning task via API
            admin_client = get_authenticated_client(admin, 'ADMIN')
            data = {
                'title': f'学习任务_{unique_suffix}',
                'deadline': (timezone.now() + timedelta(days=7)).isoformat(),
                'knowledge_ids': [k.id for k in knowledge_items],
                'assignee_ids': [student.id],
            }
            response = admin_client.post('/api/tasks/learning/', data, format='json')
            assert response.status_code == 201
            
            task_id = response.data['id']
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # View task to create progress records
            response = student_client.get(f'/api/tasks/{task_id}/learning-detail/')
            assert response.status_code == 200, f"View task failed: {response.status_code}"
            
            # Complete the first knowledge item through the task
            first_knowledge = knowledge_items[0]
            response = student_client.post(
                f'/api/tasks/{task_id}/complete-knowledge/',
                {'knowledge_id': first_knowledge.id},
                format='json'
            )
            assert response.status_code == 200
            
            # Get current completion count
            assignment = TaskAssignment.objects.get(task_id=task_id, assignee=student)
            completed_before = KnowledgeLearningProgress.objects.filter(
                assignment=assignment,
                is_completed=True
            ).count()
            
            # Browse remaining knowledge from knowledge center
            for knowledge in knowledge_items[1:]:
                response = student_client.get(f'/api/knowledge/{knowledge.id}/')
                assert response.status_code == 200
            
            # Property assertion: Completion count should not change
            completed_after = KnowledgeLearningProgress.objects.filter(
                assignment=assignment,
                is_completed=True
            ).count()
            
            assert completed_after == completed_before, \
                f"Completed count should remain {completed_before} after browsing, got {completed_after}"
            
            # Task should still be IN_PROGRESS
            assignment.refresh_from_db()
            assert assignment.status == 'IN_PROGRESS', \
                f"Task should still be IN_PROGRESS, got {assignment.status}"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()



class TestProperty23TaskOverdueStatusMarking:
    """
    **Feature: lms-backend, Property 23: 任务逾期状态标记**
    
    *For any* 截止时间已过且状态不是 COMPLETED 的 TaskAssignment，状态应该被标记为 OVERDUE。
    **Validates: Requirements 8.7**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=1, max_value=3),
        hours_past_deadline=st.integers(min_value=1, max_value=48),
    )
    def test_overdue_task_marked_when_deadline_passed(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
        hours_past_deadline,
    ):
        """
        **Feature: lms-backend, Property 23: 任务逾期状态标记**
        
        For any TaskAssignment where the deadline has passed and status
        is not COMPLETED, the status should be marked as OVERDUE.
        
        **Validates: Requirements 8.7**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create a task with deadline in the past
            past_deadline = timezone.now() - timedelta(hours=hours_past_deadline)
            
            task = Task.objects.create(
                title=f'学习任务_{unique_suffix}',
                task_type='LEARNING',
                deadline=past_deadline,
                created_by=admin,
            )
            
            # Add knowledge to task
            for i, knowledge in enumerate(knowledge_items):
                TaskKnowledge.objects.create(
                    task=task,
                    knowledge=knowledge,
                    order=i + 1
                )
            
            # Create assignment - it will be IN_PROGRESS by default for learning tasks
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            # Verify initial status
            assert assignment.status == 'IN_PROGRESS'
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Access the task list - this should trigger overdue check
            response = student_client.get('/api/tasks/my-assignments/')
            assert response.status_code == 200
            
            # Property assertion: Task should be marked as OVERDUE
            assignment.refresh_from_db()
            assert assignment.status == 'OVERDUE', \
                f"Task should be marked as OVERDUE when deadline has passed, got {assignment.status}"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=1, max_value=3),
        hours_past_deadline=st.integers(min_value=1, max_value=48),
    )
    def test_completed_task_not_marked_overdue(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
        hours_past_deadline,
    ):
        """
        **Feature: lms-backend, Property 23: 任务逾期状态标记**
        
        For any TaskAssignment that is already COMPLETED, even if the
        deadline has passed, the status should remain COMPLETED.
        
        **Validates: Requirements 8.7**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create a task with deadline in the past
            past_deadline = timezone.now() - timedelta(hours=hours_past_deadline)
            
            task = Task.objects.create(
                title=f'学习任务_{unique_suffix}',
                task_type='LEARNING',
                deadline=past_deadline,
                created_by=admin,
            )
            
            # Add knowledge to task
            for i, knowledge in enumerate(knowledge_items):
                TaskKnowledge.objects.create(
                    task=task,
                    knowledge=knowledge,
                    order=i + 1
                )
            
            # Create assignment first (will be IN_PROGRESS by default)
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Then mark it as completed using the proper method
            # This simulates a task that was completed before the deadline
            assignment.mark_completed()
            
            # Verify it's now COMPLETED
            assert assignment.status == 'COMPLETED'
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Access the task list - this should NOT change completed status
            response = student_client.get('/api/tasks/my-assignments/')
            assert response.status_code == 200
            
            # Property assertion: Task should remain COMPLETED
            assignment.refresh_from_db()
            assert assignment.status == 'COMPLETED', \
                f"Completed task should remain COMPLETED even after deadline, got {assignment.status}"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=1, max_value=3),
        hours_until_deadline=st.integers(min_value=1, max_value=168),
    )
    def test_task_not_marked_overdue_before_deadline(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
        hours_until_deadline,
    ):
        """
        **Feature: lms-backend, Property 23: 任务逾期状态标记**
        
        For any TaskAssignment where the deadline has NOT passed,
        the status should NOT be marked as OVERDUE.
        
        **Validates: Requirements 8.7**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create a task with deadline in the future
            future_deadline = timezone.now() + timedelta(hours=hours_until_deadline)
            
            task = Task.objects.create(
                title=f'学习任务_{unique_suffix}',
                task_type='LEARNING',
                deadline=future_deadline,
                created_by=admin,
            )
            
            # Add knowledge to task
            for i, knowledge in enumerate(knowledge_items):
                TaskKnowledge.objects.create(
                    task=task,
                    knowledge=knowledge,
                    order=i + 1
                )
            
            # Create assignment - will be IN_PROGRESS by default
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Access the task list
            response = student_client.get('/api/tasks/my-assignments/')
            assert response.status_code == 200
            
            # Property assertion: Task should remain IN_PROGRESS
            assignment.refresh_from_db()
            assert assignment.status == 'IN_PROGRESS', \
                f"Task should remain IN_PROGRESS before deadline, got {assignment.status}"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_knowledge=st.integers(min_value=2, max_value=4),
        hours_past_deadline=st.integers(min_value=1, max_value=24),
    )
    def test_cannot_complete_knowledge_after_overdue(
        self,
        setup_roles,
        setup_departments,
        num_knowledge,
        hours_past_deadline,
    ):
        """
        **Feature: lms-backend, Property 23: 任务逾期状态标记**
        
        For any overdue task, attempting to complete knowledge learning
        should be rejected.
        
        **Validates: Requirements 8.7**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            department=dept,
        )
        
        created_users = [admin, student]
        
        try:
            # Create knowledge documents
            knowledge_items = []
            for i in range(num_knowledge):
                knowledge = Knowledge.objects.create(
                    title=f'知识_{unique_suffix}_{i}',
                    knowledge_type='OTHER',
                    content=f'测试内容{i}',
                    created_by=admin,
                )
                knowledge_items.append(knowledge)
            
            # Create a task with deadline in the past
            past_deadline = timezone.now() - timedelta(hours=hours_past_deadline)
            
            task = Task.objects.create(
                title=f'学习任务_{unique_suffix}',
                task_type='LEARNING',
                deadline=past_deadline,
                created_by=admin,
            )
            
            # Add knowledge to task
            for i, knowledge in enumerate(knowledge_items):
                TaskKnowledge.objects.create(
                    task=task,
                    knowledge=knowledge,
                    order=i + 1
                )
            
            # Create assignment - will be IN_PROGRESS by default
            assignment = TaskAssignment.objects.create(
                task=task,
                assignee=student,
            )
            
            # Get student client
            student_client = get_authenticated_client(student, 'STUDENT')
            
            # Try to complete knowledge - should fail because task is overdue
            response = student_client.post(
                f'/api/tasks/{task.id}/complete-knowledge/',
                {'knowledge_id': knowledge_items[0].id},
                format='json'
            )
            
            # Property assertion: Should be rejected with 400 error
            assert response.status_code == 400, \
                f"Should not be able to complete knowledge on overdue task, got {response.status_code}"
            
            # Verify task is marked as OVERDUE
            assignment.refresh_from_db()
            assert assignment.status == 'OVERDUE', \
                f"Task should be marked as OVERDUE, got {assignment.status}"
            
        finally:
            # Cleanup
            KnowledgeLearningProgress.objects.filter(assignment__assignee=student).delete()
            TaskKnowledge.objects.filter(task__created_by=admin).delete()
            TaskAssignment.objects.filter(assignee__in=created_users).delete()
            Task.objects.filter(created_by=admin).delete()
            Knowledge.objects.filter(created_by=admin).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
