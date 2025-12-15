"""
Unit tests for student dashboard API.

Requirements: 15.1, 15.2, 15.3
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status

from apps.tasks.models import Task, TaskAssignment, TaskKnowledge
from apps.knowledge.models import Knowledge


@pytest.mark.django_db
class TestStudentDashboardAPI:
    """Tests for student dashboard API endpoint."""
    
    def test_student_dashboard_returns_pending_tasks(self, authenticated_client, create_user):
        """
        Test that dashboard returns pending tasks for the student.
        
        Requirements: 15.1 - 学员访问仪表盘时展示待办任务列表
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        # Create a learning task assigned to the user
        task = Task.objects.create(
            title='测试学习任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(
            task=task,
            assignee=user,
            status='IN_PROGRESS'
        )
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'pending_tasks' in response.data
        assert len(response.data['pending_tasks']) == 1
        assert response.data['pending_tasks'][0]['task_id'] == task.id
        assert response.data['pending_tasks'][0]['task_type'] == 'LEARNING'
    
    def test_student_dashboard_returns_latest_knowledge(self, authenticated_client, create_user):
        """
        Test that dashboard returns latest knowledge documents.
        
        Requirements: 15.2 - 学员访问仪表盘时展示最新发布的知识文档
        """
        creator = create_user(username='knowledge_creator')
        
        # Create knowledge documents
        knowledge1 = Knowledge.objects.create(
            title='知识文档1',
            knowledge_type='OTHER',
            content='内容1',
            created_by=creator
        )
        knowledge2 = Knowledge.objects.create(
            title='知识文档2',
            knowledge_type='OTHER',
            content='内容2',
            created_by=creator
        )
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'latest_knowledge' in response.data
        assert len(response.data['latest_knowledge']) >= 2
    
    def test_student_dashboard_returns_task_summary(self, authenticated_client, create_user):
        """
        Test that dashboard returns task summary with counts.
        
        Requirements: 15.1 - 展示待办任务列表
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator2')
        
        # Create tasks with different statuses
        task1 = Task.objects.create(
            title='学习任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task1, assignee=user, status='IN_PROGRESS')
        
        task2 = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task2, assignee=user, status='COMPLETED')
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'task_summary' in response.data
        summary = response.data['task_summary']
        assert 'pending' in summary
        assert 'completed' in summary
        assert 'overdue' in summary
        assert 'total' in summary
        assert 'by_type' in summary
    
    def test_student_dashboard_excludes_completed_tasks_from_pending(self, authenticated_client, create_user):
        """
        Test that completed tasks are not included in pending tasks list.
        
        Requirements: 15.1 - 展示待办任务列表（进行中的任务）
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator3')
        
        # Create a completed task
        task = Task.objects.create(
            title='已完成任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user)
        # Mark as completed after creation (save() sets initial status)
        assignment.mark_completed()
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        # Completed task should not appear in pending_tasks
        pending_task_ids = [t['task_id'] for t in response.data['pending_tasks']]
        assert task.id not in pending_task_ids
    
    def test_student_dashboard_excludes_other_users_tasks(self, authenticated_client, create_user):
        """
        Test that tasks assigned to other users are not shown.
        
        Requirements: 15.1 - 展示当前学员的待办任务
        """
        other_user = create_user(username='other_user')
        creator = create_user(username='task_creator4')
        
        # Create a task assigned to another user
        task = Task.objects.create(
            title='其他用户任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task, assignee=other_user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        # Other user's task should not appear
        pending_task_ids = [t['task_id'] for t in response.data['pending_tasks']]
        assert task.id not in pending_task_ids
    
    def test_student_dashboard_pending_tasks_ordered_by_deadline(self, authenticated_client, create_user):
        """
        Test that pending tasks are ordered by deadline (earliest first).
        
        Requirements: 15.1 - 展示待办任务列表
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator5')
        
        # Create tasks with different deadlines
        task1 = Task.objects.create(
            title='任务1',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=10),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task1, assignee=user, status='IN_PROGRESS')
        
        task2 = Task.objects.create(
            title='任务2',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=3),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task2, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        pending_tasks = response.data['pending_tasks']
        assert len(pending_tasks) >= 2
        # Earlier deadline should come first
        assert pending_tasks[0]['task_id'] == task2.id
        assert pending_tasks[1]['task_id'] == task1.id
    
    def test_student_dashboard_respects_pending_limit(self, authenticated_client, create_user):
        """
        Test that pending_limit query parameter limits the number of tasks.
        
        Requirements: 15.1 - 展示待办任务列表
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator6')
        
        # Create multiple tasks
        for i in range(5):
            task = Task.objects.create(
                title=f'任务{i}',
                task_type='LEARNING',
                deadline=timezone.now() + timedelta(days=7),
                created_by=creator
            )
            TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/dashboard/student/?pending_limit=3')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['pending_tasks']) == 3
    
    def test_student_dashboard_respects_knowledge_limit(self, authenticated_client, create_user):
        """
        Test that knowledge_limit query parameter limits the number of knowledge docs.
        
        Requirements: 15.2 - 展示最新发布的知识文档
        """
        creator = create_user(username='knowledge_creator2')
        
        # Create multiple knowledge documents
        for i in range(5):
            Knowledge.objects.create(
                title=f'知识文档{i}',
                knowledge_type='OTHER',
                content=f'内容{i}',
                created_by=creator
            )
        
        response = authenticated_client.get('/api/analytics/dashboard/student/?knowledge_limit=2')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['latest_knowledge']) == 2
    
    def test_student_dashboard_includes_exam_pending_status(self, authenticated_client, create_user):
        """
        Test that exam tasks with PENDING_EXAM status are included in pending tasks.
        
        Requirements: 15.1 - 展示待办任务列表（考试）
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator7')
        
        # Create an exam task
        task = Task.objects.create(
            title='考试任务',
            task_type='EXAM',
            deadline=timezone.now() + timedelta(days=7),
            start_time=timezone.now(),
            duration=60,
            pass_score=60.0,
            created_by=creator
        )
        TaskAssignment.objects.create(task=task, assignee=user, status='PENDING_EXAM')
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        pending_task_ids = [t['task_id'] for t in response.data['pending_tasks']]
        assert task.id in pending_task_ids
    
    def test_student_dashboard_excludes_deleted_tasks(self, authenticated_client, create_user):
        """
        Test that deleted tasks are not shown in pending tasks.
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator8')
        
        # Create a deleted task
        task = Task.objects.create(
            title='已删除任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator,
            is_deleted=True
        )
        TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        pending_task_ids = [t['task_id'] for t in response.data['pending_tasks']]
        assert task.id not in pending_task_ids
    
    def test_student_dashboard_excludes_closed_tasks(self, authenticated_client, create_user):
        """
        Test that closed tasks are not shown in pending tasks.
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator9')
        
        # Create a closed task
        task = Task.objects.create(
            title='已关闭任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator,
            is_closed=True
        )
        TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        pending_task_ids = [t['task_id'] for t in response.data['pending_tasks']]
        assert task.id not in pending_task_ids
    
    def test_student_dashboard_excludes_deleted_knowledge(self, authenticated_client, create_user):
        """
        Test that deleted knowledge documents are not shown.
        
        Requirements: 15.2 - 展示最新发布的知识文档
        """
        creator = create_user(username='knowledge_creator3')
        
        # Create a deleted knowledge document
        knowledge = Knowledge.objects.create(
            title='已删除知识',
            knowledge_type='OTHER',
            content='内容',
            created_by=creator,
            is_deleted=True
        )
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        knowledge_ids = [k['id'] for k in response.data['latest_knowledge']]
        assert knowledge.id not in knowledge_ids
    
    def test_student_dashboard_requires_authentication(self, api_client):
        """
        Test that unauthenticated requests are rejected.
        """
        response = api_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_student_dashboard_task_progress_for_learning_task(self, authenticated_client, create_user):
        """
        Test that progress is calculated correctly for learning tasks.
        
        Requirements: 15.1 - 展示待办任务列表
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator10')
        
        # Create a learning task with knowledge items
        task = Task.objects.create(
            title='学习任务带知识',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        # Add knowledge items to the task
        knowledge1 = Knowledge.objects.create(
            title='知识1',
            knowledge_type='OTHER',
            content='内容1',
            created_by=creator
        )
        knowledge2 = Knowledge.objects.create(
            title='知识2',
            knowledge_type='OTHER',
            content='内容2',
            created_by=creator
        )
        TaskKnowledge.objects.create(task=task, knowledge=knowledge1, order=1)
        TaskKnowledge.objects.create(task=task, knowledge=knowledge2, order=2)
        
        response = authenticated_client.get('/api/analytics/dashboard/student/')
        
        assert response.status_code == status.HTTP_200_OK
        pending_tasks = response.data['pending_tasks']
        task_data = next((t for t in pending_tasks if t['task_id'] == task.id), None)
        assert task_data is not None
        assert 'progress' in task_data
        assert task_data['progress']['total'] == 2
        assert task_data['progress']['completed'] == 0
        assert task_data['progress']['percentage'] == 0
