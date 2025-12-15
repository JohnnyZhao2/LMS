"""
Unit tests for mentor/department manager dashboard API.

Requirements: 19.1, 19.2, 19.3, 19.4
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from rest_framework import status

from apps.tasks.models import Task, TaskAssignment, TaskQuiz
from apps.quizzes.models import Quiz
from apps.submissions.models import Submission
from apps.users.models import UserRole


@pytest.mark.django_db
class TestMentorDashboardAPI:
    """Tests for mentor/department manager dashboard API endpoint."""
    
    def test_mentor_dashboard_returns_mentee_statistics(
        self, api_client, create_user, mentor_role, department
    ):
        """
        Test that mentor dashboard returns statistics for mentees.
        
        Requirements: 19.1 - 导师访问仪表盘时展示名下学员的完成率和平均分
        """
        # Create mentor
        mentor = create_user(username='mentor', department=department)
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        # Create mentees
        mentee1 = create_user(username='mentee1', mentor=mentor, department=department)
        mentee2 = create_user(username='mentee2', mentor=mentor, department=department)
        
        # Create tasks for mentees
        task = Task.objects.create(
            title='测试任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=mentor
        )
        assignment1 = TaskAssignment.objects.create(task=task, assignee=mentee1)
        assignment1.status = 'COMPLETED'
        assignment1.save()
        TaskAssignment.objects.create(task=task, assignee=mentee2)  # Default IN_PROGRESS
        
        # Authenticate as mentor
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(mentor)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'summary' in response.data
        assert 'students' in response.data
        assert response.data['summary']['total_students'] == 2
        assert response.data['summary']['total_tasks'] == 2
        assert response.data['summary']['completed_tasks'] == 1
    
    def test_mentor_dashboard_shows_completion_rate(
        self, api_client, create_user, mentor_role, department
    ):
        """
        Test that mentor dashboard shows correct completion rate.
        
        Requirements: 19.1 - 导师访问仪表盘时展示名下学员的完成率
        """
        mentor = create_user(username='mentor2', department=department)
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        mentee = create_user(username='mentee3', mentor=mentor, department=department)
        
        # Create 4 tasks, 2 completed
        for i in range(4):
            task = Task.objects.create(
                title=f'任务{i}',
                task_type='LEARNING',
                deadline=timezone.now() + timedelta(days=7),
                created_by=mentor
            )
            assignment = TaskAssignment.objects.create(task=task, assignee=mentee)
            if i < 2:
                assignment.status = 'COMPLETED'
                assignment.save()
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(mentor)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        # 2 out of 4 = 50%
        assert response.data['summary']['overall_completion_rate'] == 50.0

    
    def test_mentor_dashboard_shows_pending_grading_count(
        self, api_client, create_user, mentor_role, department
    ):
        """
        Test that mentor dashboard shows pending grading count.
        
        Requirements: 19.3 - 用户访问仪表盘时展示待评分考试数量
        """
        mentor = create_user(username='mentor3', department=department)
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        mentee = create_user(username='mentee4', mentor=mentor, department=department)
        
        # Create exam task with quiz
        quiz = Quiz.objects.create(
            title='测试试卷',
            created_by=mentor
        )
        
        task = Task.objects.create(
            title='考试任务',
            task_type='EXAM',
            deadline=timezone.now() + timedelta(days=7),
            start_time=timezone.now() - timedelta(hours=1),
            duration=60,
            pass_score=Decimal('60.00'),
            created_by=mentor
        )
        TaskQuiz.objects.create(task=task, quiz=quiz)
        assignment = TaskAssignment.objects.create(task=task, assignee=mentee)
        
        # Create submission with GRADING status (pending grading)
        Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=mentee,
            status='GRADING',
            total_score=Decimal('100.00')
        )
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(mentor)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['summary']['pending_grading_count'] == 1
    
    def test_dept_manager_dashboard_returns_department_statistics(
        self, api_client, create_user, dept_manager_role, department
    ):
        """
        Test that department manager dashboard returns statistics for department members.
        
        Requirements: 19.2 - 室经理访问仪表盘时展示本室学员的完成率和平均分
        """
        # Create department manager
        dept_manager = create_user(username='dept_manager', department=department)
        UserRole.objects.get_or_create(user=dept_manager, role=dept_manager_role)
        
        # Create department members
        member1 = create_user(username='member1', department=department)
        member2 = create_user(username='member2', department=department)
        
        # Create tasks for members
        task = Task.objects.create(
            title='部门任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=dept_manager
        )
        TaskAssignment.objects.create(task=task, assignee=member1, status='COMPLETED')
        TaskAssignment.objects.create(task=task, assignee=member2, status='IN_PROGRESS')
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(dept_manager)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'summary' in response.data
        assert 'students' in response.data
        # Department manager sees department members (excluding self)
        assert response.data['summary']['total_students'] == 2
    
    def test_mentor_dashboard_shows_quick_links(
        self, api_client, create_user, mentor_role, department
    ):
        """
        Test that mentor dashboard provides quick links.
        
        Requirements: 19.4 - 用户访问仪表盘时提供新建任务、测试中心、抽查的快捷入口
        """
        mentor = create_user(username='mentor4', department=department)
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(mentor)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'quick_links' in response.data
        quick_links = response.data['quick_links']
        assert 'create_learning_task' in quick_links
        assert 'create_practice_task' in quick_links
        assert 'create_exam_task' in quick_links
        assert 'test_center' in quick_links
        assert 'spot_checks' in quick_links
        assert 'grading_center' in quick_links
    
    def test_mentor_dashboard_shows_average_score(
        self, api_client, create_user, mentor_role, department
    ):
        """
        Test that mentor dashboard shows average score for mentees.
        
        Requirements: 19.1 - 导师访问仪表盘时展示名下学员的平均分
        """
        mentor = create_user(username='mentor5', department=department)
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        mentee = create_user(username='mentee5', mentor=mentor, department=department)
        
        # Create practice task with quiz
        quiz = Quiz.objects.create(
            title='练习试卷',
            created_by=mentor
        )
        
        task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=mentor
        )
        TaskQuiz.objects.create(task=task, quiz=quiz)
        assignment = TaskAssignment.objects.create(task=task, assignee=mentee)
        
        # Create graded submissions with scores
        Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=mentee,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('80.00'),
            attempt_number=1
        )
        Submission.objects.create(
            task_assignment=assignment,
            quiz=quiz,
            user=mentee,
            status='GRADED',
            total_score=Decimal('100.00'),
            obtained_score=Decimal('90.00'),
            attempt_number=2
        )
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(mentor)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        # Average of 80 and 90 = 85
        assert response.data['summary']['overall_avg_score'] == 85.0
    
    def test_mentor_dashboard_excludes_non_mentees(
        self, api_client, create_user, mentor_role, department
    ):
        """
        Test that mentor dashboard only shows mentees, not other students.
        
        Requirements: 19.1 - 导师访问仪表盘时展示名下学员的数据
        """
        mentor = create_user(username='mentor6', department=department)
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        # Create mentee
        mentee = create_user(username='mentee6', mentor=mentor, department=department)
        
        # Create non-mentee (different mentor or no mentor)
        other_mentor = create_user(username='other_mentor', department=department)
        non_mentee = create_user(username='non_mentee', mentor=other_mentor, department=department)
        
        # Create tasks for both
        task = Task.objects.create(
            title='任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=mentor
        )
        TaskAssignment.objects.create(task=task, assignee=mentee, status='IN_PROGRESS')
        TaskAssignment.objects.create(task=task, assignee=non_mentee, status='IN_PROGRESS')
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(mentor)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        # Only mentee should be counted
        assert response.data['summary']['total_students'] == 1
        assert response.data['summary']['total_tasks'] == 1
        student_ids = [s['id'] for s in response.data['students']]
        assert mentee.id in student_ids
        assert non_mentee.id not in student_ids
    
    def test_mentor_dashboard_requires_authentication(self, api_client):
        """
        Test that unauthenticated requests are rejected.
        """
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_student_cannot_access_mentor_dashboard(
        self, authenticated_client
    ):
        """
        Test that students cannot access mentor dashboard.
        """
        response = authenticated_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_mentor_dashboard_shows_task_type_breakdown(
        self, api_client, create_user, mentor_role, department
    ):
        """
        Test that mentor dashboard shows task breakdown by type.
        
        Requirements: 19.1 - 导师访问仪表盘时展示名下学员的完成率
        """
        mentor = create_user(username='mentor7', department=department)
        UserRole.objects.get_or_create(user=mentor, role=mentor_role)
        
        mentee = create_user(username='mentee7', mentor=mentor, department=department)
        
        # Create different task types
        learning_task = Task.objects.create(
            title='学习任务',
            task_type='LEARNING',
            deadline=timezone.now() + timedelta(days=7),
            created_by=mentor
        )
        learning_assignment = TaskAssignment.objects.create(task=learning_task, assignee=mentee)
        learning_assignment.status = 'COMPLETED'
        learning_assignment.save()
        
        practice_task = Task.objects.create(
            title='练习任务',
            task_type='PRACTICE',
            deadline=timezone.now() + timedelta(days=7),
            created_by=mentor
        )
        TaskAssignment.objects.create(task=practice_task, assignee=mentee)  # Default IN_PROGRESS
        
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(mentor)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.get('/api/analytics/dashboard/mentor/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'learning_tasks' in response.data['summary']
        assert 'practice_tasks' in response.data['summary']
        assert 'exam_tasks' in response.data['summary']
        assert response.data['summary']['learning_tasks']['total'] == 1
        assert response.data['summary']['learning_tasks']['completed'] == 1
        assert response.data['summary']['practice_tasks']['total'] == 1
        assert response.data['summary']['practice_tasks']['completed'] == 0
