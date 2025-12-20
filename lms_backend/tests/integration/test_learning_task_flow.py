"""
Integration tests for complete learning task business flow.

Tests the end-to-end flow:
1. Admin creates knowledge documents
2. Mentor creates learning task and assigns to students
3. Students view and complete knowledge learning
4. Task auto-completes when all knowledge is learned

Requirements: 4.1, 7.1-7.5, 8.1-8.7
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User, Role, UserRole, Department
from apps.knowledge.models import Knowledge
from apps.tasks.models import Task, TaskAssignment


@pytest.fixture
def setup_learning_flow(db):
    """Set up complete environment for learning task flow."""
    # Create departments
    dept = Department.objects.create(name='一室', code='DEPT001')
    
    # Create roles
    admin_role, _ = Role.objects.get_or_create(code='ADMIN', defaults={'name': '管理员'})
    mentor_role, _ = Role.objects.get_or_create(code='MENTOR', defaults={'name': '导师'})
    student_role, _ = Role.objects.get_or_create(code='STUDENT', defaults={'name': '学员'})
    
    # Create admin
    admin = User.objects.create_user(
        username='admin', password='admin123', employee_id='ADMIN001',
        username='管理员', department=dept
    )
    UserRole.objects.create(user=admin, role=admin_role)
    
    # Create mentor
    mentor = User.objects.create_user(
        username='mentor', password='mentor123', employee_id='MENTOR001',
        username='导师', department=dept
    )
    UserRole.objects.create(user=mentor, role=mentor_role)
    
    # Create students under mentor
    student1 = User.objects.create_user(
        username='student1', password='student123', employee_id='STU001',
        username='学员一', department=dept, mentor=mentor
    )
    student2 = User.objects.create_user(
        username='student2', password='student123', employee_id='STU002',
        username='学员二', department=dept, mentor=mentor
    )
    
    return {
        'dept': dept,
        'admin': admin,
        'mentor': mentor,
        'student1': student1,
        'student2': student2,
    }


def get_client(user):
    """Get authenticated API client for user."""
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


class TestCompleteLearningTaskFlow:
    """
    Integration test for complete learning task flow.
    
    This test verifies the entire business process from knowledge creation
    to task completion.
    """
    
    def test_complete_learning_task_flow(self, setup_learning_flow):
        """
        Test complete learning task flow end-to-end.
        
        Flow:
        1. Admin creates knowledge documents
        2. Mentor creates learning task
        3. Students view their assignments
        4. Students complete knowledge learning
        5. Task auto-completes
        """
        data = setup_learning_flow
        admin_client = get_client(data['admin'])
        mentor_client = get_client(data['mentor'])
        student1_client = get_client(data['student1'])
        student2_client = get_client(data['student2'])
        
        # Step 1: Admin creates knowledge documents
        knowledge1_resp = admin_client.post('/api/knowledge/', {
            'title': '应急处理流程',
            'knowledge_type': 'EMERGENCY',
            'fault_scenario': '系统故障场景',
            'trigger_process': '触发流程描述',
            'solution': '解决方案',
            'verification_plan': '验证方案',
            'recovery_plan': '恢复方案',
        }, format='json')
        assert knowledge1_resp.status_code == status.HTTP_201_CREATED
        knowledge1_id = knowledge1_resp.json()['id']
        
        knowledge2_resp = admin_client.post('/api/knowledge/', {
            'title': '操作手册',
            'knowledge_type': 'OTHER',
            'content': '# 操作手册\n\n这是操作手册内容',
        }, format='json')
        assert knowledge2_resp.status_code == status.HTTP_201_CREATED
        knowledge2_id = knowledge2_resp.json()['id']
        
        # Step 2: Mentor creates learning task for students
        deadline = timezone.now() + timedelta(days=7)
        task_resp = mentor_client.post('/api/tasks/learning/', {
            'title': '新员工入职学习',
            'description': '请完成以下知识文档的学习',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge1_id, knowledge2_id],
            'assignee_ids': [data['student1'].id, data['student2'].id]
        }, format='json')
        assert task_resp.status_code == status.HTTP_201_CREATED
        task_id = task_resp.json()['id']
        
        # Verify task created with correct assignments
        assert len(task_resp.json()['assignments']) == 2
        assert len(task_resp.json()['knowledge_items']) == 2
        
        # Step 3: Student1 views their assignments
        assignments_resp = student1_client.get('/api/tasks/my-assignments/')
        assert assignments_resp.status_code == status.HTTP_200_OK
        assert len(assignments_resp.json()) >= 1
        
        # Student1 views task detail
        detail_resp = student1_client.get(f'/api/tasks/{task_id}/learning-detail/')
        assert detail_resp.status_code == status.HTTP_200_OK
        assert detail_resp.json()['task_title'] == '新员工入职学习'
        assert len(detail_resp.json()['knowledge_items']) == 2
        # Progress is a dict with completed, total, percentage
        progress = detail_resp.json()['progress']
        assert progress['completed'] == 0  # No progress yet
        assert progress['total'] == 2
        
        # Step 4: Student1 completes first knowledge
        complete1_resp = student1_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge1_id
        }, format='json')
        assert complete1_resp.status_code == status.HTTP_200_OK
        assert complete1_resp.json()['is_completed'] is True
        assert complete1_resp.json()['task_completed'] is False  # Not all done yet
        
        # Verify progress updated
        detail_resp = student1_client.get(f'/api/tasks/{task_id}/learning-detail/')
        progress = detail_resp.json()['progress']
        assert progress['completed'] == 1  # 1 of 2 completed
        assert progress['percentage'] == 50.0
        
        # Step 5: Student1 completes second knowledge - task should auto-complete
        complete2_resp = student1_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge2_id
        }, format='json')
        assert complete2_resp.status_code == status.HTTP_200_OK
        assert complete2_resp.json()['task_completed'] is True
        assert complete2_resp.json()['task_status'] == 'COMPLETED'
        
        # Verify student1's assignment is completed
        assignment = TaskAssignment.objects.get(task_id=task_id, assignee=data['student1'])
        assert assignment.status == 'COMPLETED'
        assert assignment.completed_at is not None
        
        # Verify student2's assignment is still in progress
        assignment2 = TaskAssignment.objects.get(task_id=task_id, assignee=data['student2'])
        assert assignment2.status == 'IN_PROGRESS'
        
        # Student2 completes their learning
        complete1_resp = student2_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge1_id
        }, format='json')
        assert complete1_resp.status_code == status.HTTP_200_OK
        
        complete2_resp = student2_client.post(f'/api/tasks/{task_id}/complete-knowledge/', {
            'knowledge_id': knowledge2_id
        }, format='json')
        assert complete2_resp.status_code == status.HTTP_200_OK
        assert complete2_resp.json()['task_completed'] is True
        
        # Verify both assignments completed
        assert TaskAssignment.objects.filter(
            task_id=task_id, status='COMPLETED'
        ).count() == 2
    
    def test_knowledge_browsing_does_not_affect_task(self, setup_learning_flow):
        """
        Test that browsing knowledge from knowledge center doesn't affect task status.
        
        Property 22: 知识浏览不影响任务
        Requirements: 8.6
        """
        data = setup_learning_flow
        admin_client = get_client(data['admin'])
        mentor_client = get_client(data['mentor'])
        student_client = get_client(data['student1'])
        
        # Create knowledge
        knowledge_resp = admin_client.post('/api/knowledge/', {
            'title': '测试知识',
            'knowledge_type': 'OTHER',
            'content': '测试内容',
        }, format='json')
        knowledge_id = knowledge_resp.json()['id']
        
        # Create task
        deadline = timezone.now() + timedelta(days=7)
        task_resp = mentor_client.post('/api/tasks/learning/', {
            'title': '学习任务',
            'deadline': deadline.isoformat(),
            'knowledge_ids': [knowledge_id],
            'assignee_ids': [data['student1'].id]
        }, format='json')
        task_id = task_resp.json()['id']
        
        # Student browses knowledge from knowledge center (not task)
        browse_resp = student_client.get(f'/api/knowledge/{knowledge_id}/')
        assert browse_resp.status_code == status.HTTP_200_OK
        
        # Verify task assignment is still in progress
        assignment = TaskAssignment.objects.get(task_id=task_id, assignee=data['student1'])
        assert assignment.status == 'IN_PROGRESS'
