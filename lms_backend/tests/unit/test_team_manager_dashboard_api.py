"""
Unit tests for Team Manager Data Board API.

Tests:
- Team manager overview endpoint (Requirements: 21.1)
- Knowledge heat endpoint (Requirements: 21.2)
- Read-only access control (Requirements: 21.3)

Property 41: 团队经理只读访问
"""
import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from tests.factories import (
    UserFactory,
    DepartmentFactory,
    RoleFactory,
    TaskFactory,
    TaskAssignmentFactory,
    KnowledgeFactory,
    QuizFactory,
    SubmissionFactory,
)


@pytest.mark.django_db
class TestTeamManagerOverviewAPI:
    """Tests for team manager overview endpoint."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        
        # Create roles
        self.student_role = RoleFactory(code='STUDENT', name='学员')
        self.team_manager_role = RoleFactory(code='TEAM_MANAGER', name='团队经理')
        self.admin_role = RoleFactory(code='ADMIN', name='管理员')
        self.mentor_role = RoleFactory(code='MENTOR', name='导师')
        
        # Create departments
        self.dept1 = DepartmentFactory(name='一室', code='DEPT1')
        self.dept2 = DepartmentFactory(name='二室', code='DEPT2')
        
        # Create team manager
        self.team_manager = UserFactory(
            username='team_manager',
            real_name='团队经理',
            department=self.dept1
        )
        self.team_manager.roles.add(self.student_role, self.team_manager_role)
        self.team_manager.current_role = 'TEAM_MANAGER'
        
        # Create admin
        self.admin = UserFactory(
            username='admin',
            real_name='管理员',
            department=self.dept1
        )
        self.admin.roles.add(self.student_role, self.admin_role)
        self.admin.current_role = 'ADMIN'
        
        # Create students in different departments
        self.student1 = UserFactory(
            username='student1',
            real_name='学员1',
            department=self.dept1
        )
        self.student1.roles.add(self.student_role)
        
        self.student2 = UserFactory(
            username='student2',
            real_name='学员2',
            department=self.dept2
        )
        self.student2.roles.add(self.student_role)
    
    def test_team_manager_can_access_overview(self):
        """
        Test that team manager can access the overview endpoint.
        
        Requirements: 21.1
        """
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/team-overview/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'overview' in response.data
        assert 'departments' in response.data
        assert 'knowledge_heat' in response.data
    
    def test_admin_can_access_overview(self):
        """
        Test that admin can also access the overview endpoint.
        
        Requirements: 21.1
        """
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get('/api/analytics/team-overview/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'overview' in response.data
    
    def test_student_cannot_access_overview(self):
        """
        Test that regular students cannot access the overview endpoint.
        
        Requirements: 21.3
        Property 41: 团队经理只读访问
        """
        self.client.force_authenticate(user=self.student1)
        
        response = self.client.get('/api/analytics/team-overview/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_overview_shows_department_statistics(self):
        """
        Test that overview shows statistics for each department.
        
        Requirements: 21.1
        """
        # Create tasks and assignments
        task = TaskFactory(
            task_type='LEARNING',
            created_by=self.admin
        )
        TaskAssignmentFactory(
            task=task,
            assignee=self.student1,
            status='COMPLETED'
        )
        TaskAssignmentFactory(
            task=task,
            assignee=self.student2,
            status='IN_PROGRESS'
        )
        
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/team-overview/')
        
        assert response.status_code == status.HTTP_200_OK
        
        # Check departments are included
        departments = response.data['departments']
        assert len(departments) >= 2
        
        # Check department statistics structure
        for dept in departments:
            assert 'id' in dept
            assert 'name' in dept
            assert 'total_students' in dept
            assert 'total_tasks' in dept
            assert 'completed_tasks' in dept
            assert 'completion_rate' in dept
    
    def test_overview_shows_overall_statistics(self):
        """
        Test that overview shows overall statistics across all departments.
        
        Requirements: 21.1
        """
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/team-overview/')
        
        assert response.status_code == status.HTTP_200_OK
        
        overview = response.data['overview']
        assert 'total_departments' in overview
        assert 'total_students' in overview
        assert 'total_tasks' in overview
        assert 'completed_tasks' in overview
        assert 'overall_completion_rate' in overview
        assert 'learning_tasks' in overview
        assert 'practice_tasks' in overview
        assert 'exam_tasks' in overview
    
    def test_unauthenticated_cannot_access_overview(self):
        """Test that unauthenticated users cannot access the overview."""
        response = self.client.get('/api/analytics/team-overview/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestKnowledgeHeatAPI:
    """Tests for knowledge heat endpoint."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        
        # Create roles
        self.student_role = RoleFactory(code='STUDENT', name='学员')
        self.team_manager_role = RoleFactory(code='TEAM_MANAGER', name='团队经理')
        self.admin_role = RoleFactory(code='ADMIN', name='管理员')
        
        # Create department
        self.dept = DepartmentFactory(name='一室', code='DEPT1')
        
        # Create team manager
        self.team_manager = UserFactory(
            username='team_manager',
            real_name='团队经理',
            department=self.dept
        )
        self.team_manager.roles.add(self.student_role, self.team_manager_role)
        self.team_manager.current_role = 'TEAM_MANAGER'
        
        # Create student
        self.student = UserFactory(
            username='student',
            real_name='学员',
            department=self.dept
        )
        self.student.roles.add(self.student_role)
        
        # Create admin for knowledge creation
        self.admin = UserFactory(
            username='admin',
            real_name='管理员',
            department=self.dept
        )
        self.admin.roles.add(self.student_role, self.admin_role)
    
    def test_team_manager_can_access_knowledge_heat(self):
        """
        Test that team manager can access knowledge heat endpoint.
        
        Requirements: 21.2
        """
        # Create knowledge documents with different view counts
        KnowledgeFactory(
            title='热门知识1',
            view_count=100,
            created_by=self.admin
        )
        KnowledgeFactory(
            title='热门知识2',
            view_count=50,
            created_by=self.admin
        )
        
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/knowledge-heat/')
        
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
        assert 'summary' in response.data
    
    def test_knowledge_heat_ordered_by_view_count(self):
        """
        Test that knowledge heat results are ordered by view count descending.
        
        Requirements: 21.2
        """
        # Create knowledge documents with different view counts
        k1 = KnowledgeFactory(
            title='低热度知识',
            view_count=10,
            created_by=self.admin
        )
        k2 = KnowledgeFactory(
            title='高热度知识',
            view_count=100,
            created_by=self.admin
        )
        k3 = KnowledgeFactory(
            title='中热度知识',
            view_count=50,
            created_by=self.admin
        )
        
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/knowledge-heat/')
        
        assert response.status_code == status.HTTP_200_OK
        
        results = response.data['results']
        assert len(results) >= 3
        
        # Check ordering (highest view count first)
        view_counts = [r['view_count'] for r in results]
        assert view_counts == sorted(view_counts, reverse=True)
    
    def test_knowledge_heat_shows_summary(self):
        """
        Test that knowledge heat shows summary statistics.
        
        Requirements: 21.2
        """
        KnowledgeFactory(
            title='知识1',
            view_count=100,
            created_by=self.admin
        )
        KnowledgeFactory(
            title='知识2',
            view_count=50,
            created_by=self.admin
        )
        
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/knowledge-heat/')
        
        assert response.status_code == status.HTTP_200_OK
        
        summary = response.data['summary']
        assert 'total_knowledge' in summary
        assert 'total_views' in summary
        assert 'avg_views' in summary
        assert summary['total_knowledge'] >= 2
        assert summary['total_views'] >= 150
    
    def test_student_cannot_access_knowledge_heat(self):
        """
        Test that regular students cannot access knowledge heat endpoint.
        
        Requirements: 21.3
        Property 41: 团队经理只读访问
        """
        self.client.force_authenticate(user=self.student)
        
        response = self.client.get('/api/analytics/knowledge-heat/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_knowledge_heat_supports_limit_parameter(self):
        """
        Test that knowledge heat supports limit parameter.
        
        Requirements: 21.2
        """
        # Create multiple knowledge documents
        for i in range(10):
            KnowledgeFactory(
                title=f'知识{i}',
                view_count=i * 10,
                created_by=self.admin
            )
        
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/knowledge-heat/', {'limit': 5})
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 5
    
    def test_knowledge_heat_supports_type_filter(self):
        """
        Test that knowledge heat supports knowledge type filter.
        
        Requirements: 21.2
        """
        KnowledgeFactory(
            title='应急知识',
            knowledge_type='EMERGENCY',
            view_count=100,
            created_by=self.admin
        )
        KnowledgeFactory(
            title='其他知识',
            knowledge_type='OTHER',
            view_count=50,
            created_by=self.admin
        )
        
        self.client.force_authenticate(user=self.team_manager)
        
        response = self.client.get('/api/analytics/knowledge-heat/', {'knowledge_type': 'EMERGENCY'})
        
        assert response.status_code == status.HTTP_200_OK
        
        # All results should be EMERGENCY type
        for result in response.data['results']:
            assert result['knowledge_type'] == 'EMERGENCY'
    
    def test_unauthenticated_cannot_access_knowledge_heat(self):
        """Test that unauthenticated users cannot access knowledge heat."""
        response = self.client.get('/api/analytics/knowledge-heat/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTeamManagerReadOnlyAccess:
    """
    Tests for team manager read-only access control.
    
    Requirements: 21.3
    Property 41: 团队经理只读访问
    """
    
    def setup_method(self):
        """Set up test fixtures."""
        self.client = APIClient()
        
        # Create roles
        self.student_role = RoleFactory(code='STUDENT', name='学员')
        self.team_manager_role = RoleFactory(code='TEAM_MANAGER', name='团队经理')
        
        # Create department
        self.dept = DepartmentFactory(name='一室', code='DEPT1')
        
        # Create team manager
        self.team_manager = UserFactory(
            username='team_manager',
            real_name='团队经理',
            department=self.dept
        )
        self.team_manager.roles.add(self.student_role, self.team_manager_role)
        self.team_manager.current_role = 'TEAM_MANAGER'
    
    def test_team_manager_can_only_read_overview(self):
        """
        Test that team manager can only perform GET requests on overview.
        
        Requirements: 21.3
        Property 41: 团队经理只读访问
        """
        self.client.force_authenticate(user=self.team_manager)
        
        # GET should work
        response = self.client.get('/api/analytics/team-overview/')
        assert response.status_code == status.HTTP_200_OK
        
        # POST should fail (method not allowed)
        response = self.client.post('/api/analytics/team-overview/', {})
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    
    def test_team_manager_can_only_read_knowledge_heat(self):
        """
        Test that team manager can only perform GET requests on knowledge heat.
        
        Requirements: 21.3
        Property 41: 团队经理只读访问
        """
        self.client.force_authenticate(user=self.team_manager)
        
        # GET should work
        response = self.client.get('/api/analytics/knowledge-heat/')
        assert response.status_code == status.HTTP_200_OK
        
        # POST should fail (method not allowed)
        response = self.client.post('/api/analytics/knowledge-heat/', {})
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
