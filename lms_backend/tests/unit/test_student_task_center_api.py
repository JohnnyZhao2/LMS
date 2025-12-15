"""
Unit tests for student task center API.

Requirements: 17.1, 17.2, 17.3
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status

from apps.tasks.models import Task, TaskAssignment, TaskKnowledge
from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz


@pytest.mark.django_db
class TestStudentTaskCenterListAPI:
    """Tests for student task center list API endpoint."""
    
    def test_task_center_returns_all_assigned_tasks(self, authenticated_client, create_user):
        """
        Test that task center returns all tasks assigned to the student.
        
        Requirements: 17.1 - 学员访问任务中心时展示任务列表
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        # Create tasks of different types
        learning_task = Task.objects.create(
            title='学习任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=learning_task, assignee=user, status='IN_PROGRESS')
        
        practice_task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=practice_task, assignee=user, status='IN_PROGRESS')
        
        exam_task = Task.objects.create(
            title='考试任务',
            task_type='EXAM',
            deadline=timezone.now() + timedelta(days=7),
            start_time=timezone.now(),
            duration=60,
            pass_score=60.0,
            created_by=creator
        )
        TaskAssignment.objects.create(task=exam_task, assignee=user, status='PENDING_EXAM')
        
        response = authenticated_client.get('/api/analytics/task-center/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert response.data['count'] == 3
        
        task_ids = [t['task_id'] for t in response.data['results']]
        assert learning_task.id in task_ids
        assert practice_task.id in task_ids
        assert exam_task.id in task_ids
    
    def test_task_center_filter_by_task_type(self, authenticated_client, create_user):
        """
        Test filtering tasks by type.
        
        Requirements: 17.1 - 支持按类型（学习/练习/考试）筛选
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        # Create tasks of different types
        learning_task = Task.objects.create(
            title='学习任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=learning_task, assignee=user, status='IN_PROGRESS')
        
        practice_task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=practice_task, assignee=user, status='IN_PROGRESS')
        
        # Filter by LEARNING type
        response = authenticated_client.get('/api/analytics/task-center/?task_type=LEARNING')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['task_type'] == 'LEARNING'
    
    def test_task_center_filter_by_status(self, authenticated_client, create_user):
        """
        Test filtering tasks by status.
        
        Requirements: 17.1 - 支持按状态（进行中/已完成/已逾期）筛选
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        # Create tasks with different statuses
        task1 = Task.objects.create(
            title='进行中任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task1, assignee=user, status='IN_PROGRESS')
        
        task2 = Task.objects.create(
            title='已完成任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment2 = TaskAssignment.objects.create(task=task2, assignee=user)
        assignment2.mark_completed()
        
        # Filter by COMPLETED status
        response = authenticated_client.get('/api/analytics/task-center/?status=COMPLETED')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['status'] == 'COMPLETED'
    
    def test_task_center_returns_task_details(self, authenticated_client, create_user):
        """
        Test that task center returns required task details.
        
        Requirements: 17.2 - 展示任务标题、类型、状态、截止时间和进度
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='测试任务',
            description='任务描述',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/task-center/')
        
        assert response.status_code == status.HTTP_200_OK
        task_data = response.data['results'][0]
        
        # Check required fields
        assert 'task_title' in task_data
        assert 'task_type' in task_data
        assert 'task_type_display' in task_data
        assert 'status' in task_data
        assert 'status_display' in task_data
        assert 'deadline' in task_data
        assert 'progress' in task_data
        
        assert task_data['task_title'] == '测试任务'
        assert task_data['task_type'] == 'LEARNING'
    
    def test_task_center_excludes_other_users_tasks(self, authenticated_client, create_user):
        """
        Test that tasks assigned to other users are not shown.
        """
        other_user = create_user(username='other_user')
        creator = create_user(username='task_creator')
        
        # Create a task assigned to another user
        task = Task.objects.create(
            title='其他用户任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task, assignee=other_user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/task-center/')
        
        assert response.status_code == status.HTTP_200_OK
        task_ids = [t['task_id'] for t in response.data['results']]
        assert task.id not in task_ids
    
    def test_task_center_excludes_deleted_tasks(self, authenticated_client, create_user):
        """
        Test that deleted tasks are not shown.
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        # Create a deleted task
        task = Task.objects.create(
            title='已删除任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator,
            is_deleted=True
        )
        TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/task-center/')
        
        assert response.status_code == status.HTTP_200_OK
        task_ids = [t['task_id'] for t in response.data['results']]
        assert task.id not in task_ids
    
    def test_task_center_search_by_title(self, authenticated_client, create_user):
        """
        Test searching tasks by title.
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task1 = Task.objects.create(
            title='Python学习任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task1, assignee=user, status='IN_PROGRESS')
        
        task2 = Task.objects.create(
            title='Java练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        TaskAssignment.objects.create(task=task2, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/task-center/?search=Python')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['task_title'] == 'Python学习任务'
    
    def test_task_center_pagination(self, authenticated_client, create_user):
        """
        Test pagination of task list.
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        # Create multiple tasks
        for i in range(5):
            task = Task.objects.create(
                title=f'任务{i}',
                task_type='LEARNING',
                deadline=timezone.now() + timedelta(days=7),
                created_by=creator
            )
            TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get('/api/analytics/task-center/?page=1&page_size=2')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        assert response.data['count'] == 5
        assert response.data['page'] == 1
        assert response.data['page_size'] == 2
        assert response.data['total_pages'] == 3
    
    def test_task_center_requires_authentication(self, api_client):
        """
        Test that unauthenticated requests are rejected.
        """
        response = api_client.get('/api/analytics/task-center/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_task_center_progress_for_learning_task(self, authenticated_client, create_user):
        """
        Test that progress is calculated correctly for learning tasks.
        
        Requirements: 17.2 - 展示进度
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='学习任务带知识',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        # Add knowledge items
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
        
        response = authenticated_client.get('/api/analytics/task-center/')
        
        assert response.status_code == status.HTTP_200_OK
        task_data = response.data['results'][0]
        assert task_data['progress']['total'] == 2
        assert task_data['progress']['completed'] == 0
        assert task_data['progress']['percentage'] == 0


@pytest.mark.django_db
class TestStudentTaskCenterDetailAPI:
    """Tests for student task center detail API endpoint."""
    
    def test_task_center_detail_returns_task_info(self, authenticated_client, create_user):
        """
        Test that task detail returns task information with redirect path.
        
        Requirements: 17.3 - 点击任务时根据任务类型跳转到对应的任务详情页
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='测试任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get(f'/api/analytics/task-center/{assignment.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'task_id' in response.data
        assert 'redirect_path' in response.data
        assert response.data['task_id'] == task.id
    
    def test_task_center_detail_redirect_path_for_learning(self, authenticated_client, create_user):
        """
        Test redirect path for learning task.
        
        Requirements: 17.3 - 根据任务类型跳转
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='学习任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get(f'/api/analytics/task-center/{assignment.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['redirect_path'] == f'/student/tasks/learning/{assignment.id}'
    
    def test_task_center_detail_redirect_path_for_practice(self, authenticated_client, create_user):
        """
        Test redirect path for practice task.
        
        Requirements: 17.3 - 根据任务类型跳转
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get(f'/api/analytics/task-center/{assignment.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['redirect_path'] == f'/student/tasks/practice/{assignment.id}'
    
    def test_task_center_detail_redirect_path_for_exam(self, authenticated_client, create_user):
        """
        Test redirect path for exam task.
        
        Requirements: 17.3 - 根据任务类型跳转
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='考试任务',
            task_type='EXAM',
            deadline=timezone.now() + timedelta(days=7),
            start_time=timezone.now(),
            duration=60,
            pass_score=60.0,
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='PENDING_EXAM')
        
        response = authenticated_client.get(f'/api/analytics/task-center/{assignment.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['redirect_path'] == f'/student/tasks/exam/{assignment.id}'
    
    def test_task_center_detail_not_found_for_other_user(self, authenticated_client, create_user):
        """
        Test that accessing another user's task returns 400 error.
        """
        other_user = create_user(username='other_user')
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='其他用户任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=other_user, status='IN_PROGRESS')
        
        response = authenticated_client.get(f'/api/analytics/task-center/{assignment.id}/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_task_center_detail_not_found_for_deleted_task(self, authenticated_client, create_user):
        """
        Test that accessing a deleted task returns 400 error.
        """
        user = authenticated_client.user
        creator = create_user(username='task_creator')
        
        task = Task.objects.create(
            title='已删除任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator,
            is_deleted=True
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = authenticated_client.get(f'/api/analytics/task-center/{assignment.id}/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_task_center_detail_requires_authentication(self, api_client, create_user):
        """
        Test that unauthenticated requests are rejected.
        """
        creator = create_user(username='task_creator')
        user = create_user(username='test_user')
        
        task = Task.objects.create(
            title='测试任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=creator
        )
        assignment = TaskAssignment.objects.create(task=task, assignee=user, status='IN_PROGRESS')
        
        response = api_client.get(f'/api/analytics/task-center/{assignment.id}/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
