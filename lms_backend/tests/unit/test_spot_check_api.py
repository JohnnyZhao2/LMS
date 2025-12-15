"""
Tests for spot check API endpoints.

Requirements: 14.1, 14.2, 14.3, 14.4
Properties: 35, 36
"""
import pytest
from decimal import Decimal
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import Role, UserRole
from tests.factories import (
    UserFactory, DepartmentFactory, RoleFactory,
    SpotCheckFactory,
)


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def department():
    return DepartmentFactory()


@pytest.fixture
def other_department():
    return DepartmentFactory()


@pytest.fixture
def mentor_role():
    return RoleFactory(code='MENTOR', name='导师')


@pytest.fixture
def dept_manager_role():
    return RoleFactory(code='DEPT_MANAGER', name='室经理')


@pytest.fixture
def admin_role():
    return RoleFactory(code='ADMIN', name='管理员')


@pytest.fixture
def student_role():
    return RoleFactory(code='STUDENT', name='学员')


@pytest.fixture
def mentor(department, mentor_role, student_role):
    user = UserFactory(department=department)
    UserRole.objects.create(user=user, role=mentor_role)
    return user


@pytest.fixture
def dept_manager(department, dept_manager_role, student_role):
    user = UserFactory(department=department)
    UserRole.objects.create(user=user, role=dept_manager_role)
    return user


@pytest.fixture
def admin_user(department, admin_role, student_role):
    user = UserFactory(department=department)
    UserRole.objects.create(user=user, role=admin_role)
    return user


@pytest.fixture
def mentee(department, mentor, student_role):
    """A student who is a mentee of the mentor."""
    return UserFactory(department=department, mentor=mentor)


@pytest.fixture
def dept_member(department, student_role):
    """A student in the same department as dept_manager."""
    return UserFactory(department=department)


@pytest.fixture
def other_dept_student(other_department, student_role):
    """A student in a different department."""
    return UserFactory(department=other_department)


def get_auth_header(user, role_code=None):
    """Generate JWT auth header for a user."""
    refresh = RefreshToken.for_user(user)
    if role_code:
        refresh['current_role'] = role_code
    return {'HTTP_AUTHORIZATION': f'Bearer {refresh.access_token}'}


@pytest.mark.django_db
class TestSpotCheckCreateAsMentor:
    """Tests for spot check creation by mentors."""
    
    def test_mentor_can_create_spot_check_for_mentee(
        self, api_client, mentor, mentee
    ):
        """
        Test that a mentor can create a spot check for their mentee.
        
        Requirements: 14.1, 14.2
        Property 35: 抽查学员范围限制
        """
        checked_at = timezone.now()
        data = {
            'student': mentee.id,
            'content': '抽查知识点A',
            'score': '85.00',
            'comment': '表现良好',
            'checked_at': checked_at.isoformat(),
        }
        
        response = api_client.post(
            '/api/spot-checks/',
            data,
            format='json',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 201
        assert response.data['student'] == mentee.id
        assert response.data['checker'] == mentor.id
        assert response.data['content'] == '抽查知识点A'
        assert Decimal(response.data['score']) == Decimal('85.00')
        assert response.data['comment'] == '表现良好'
    
    def test_mentor_cannot_create_spot_check_for_non_mentee(
        self, api_client, mentor, dept_member
    ):
        """
        Test that a mentor cannot create a spot check for a non-mentee.
        
        Requirements: 14.2
        Property 35: 抽查学员范围限制
        """
        data = {
            'student': dept_member.id,
            'content': '抽查知识点A',
            'score': '85.00',
            'checked_at': timezone.now().isoformat(),
        }
        
        response = api_client.post(
            '/api/spot-checks/',
            data,
            format='json',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 400


@pytest.mark.django_db
class TestSpotCheckCreateAsDeptManager:
    """Tests for spot check creation by department managers."""
    
    def test_dept_manager_can_create_spot_check_for_dept_member(
        self, api_client, dept_manager, dept_member
    ):
        """
        Test that a dept manager can create a spot check for a department member.
        
        Requirements: 14.1, 14.3
        Property 35: 抽查学员范围限制
        """
        data = {
            'student': dept_member.id,
            'content': '抽查知识点B',
            'score': '90.00',
            'comment': '优秀',
            'checked_at': timezone.now().isoformat(),
        }
        
        response = api_client.post(
            '/api/spot-checks/',
            data,
            format='json',
            **get_auth_header(dept_manager, 'DEPT_MANAGER')
        )
        
        assert response.status_code == 201
        assert response.data['student'] == dept_member.id
        assert response.data['checker'] == dept_manager.id
    
    def test_dept_manager_cannot_create_spot_check_for_other_dept(
        self, api_client, dept_manager, other_dept_student
    ):
        """
        Test that a dept manager cannot create a spot check for a student in another department.
        
        Requirements: 14.3
        Property 35: 抽查学员范围限制
        """
        data = {
            'student': other_dept_student.id,
            'content': '抽查知识点B',
            'score': '90.00',
            'checked_at': timezone.now().isoformat(),
        }
        
        response = api_client.post(
            '/api/spot-checks/',
            data,
            format='json',
            **get_auth_header(dept_manager, 'DEPT_MANAGER')
        )
        
        assert response.status_code == 400


@pytest.mark.django_db
class TestSpotCheckList:
    """Tests for spot check list endpoint."""
    
    def test_mentor_sees_only_mentees_spot_checks(
        self, api_client, mentor, mentee, dept_member
    ):
        """
        Test that a mentor only sees spot checks for their mentees.
        
        Requirements: 14.4
        Property 35: 抽查学员范围限制
        """
        # Create spot check for mentee
        SpotCheckFactory(student=mentee, checker=mentor)
        # Create spot check for non-mentee (should not be visible)
        SpotCheckFactory(student=dept_member, checker=mentor)
        
        response = api_client.get(
            '/api/spot-checks/',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['student'] == mentee.id
    
    def test_dept_manager_sees_only_dept_spot_checks(
        self, api_client, dept_manager, dept_member, other_dept_student
    ):
        """
        Test that a dept manager only sees spot checks for department members.
        
        Requirements: 14.4
        Property 38: 室经理数据范围限制
        """
        # Create spot check for dept member
        SpotCheckFactory(student=dept_member, checker=dept_manager)
        # Create spot check for other dept (should not be visible)
        SpotCheckFactory(student=other_dept_student, checker=dept_manager)
        
        response = api_client.get(
            '/api/spot-checks/',
            **get_auth_header(dept_manager, 'DEPT_MANAGER')
        )
        
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['student'] == dept_member.id
    
    def test_spot_checks_ordered_by_checked_at_descending(
        self, api_client, mentor, mentee
    ):
        """
        Test that spot checks are ordered by checked_at in descending order.
        
        Requirements: 14.4
        Property 36: 抽查记录时间排序
        """
        from datetime import timedelta
        
        now = timezone.now()
        # Create older spot check first
        older = SpotCheckFactory(
            student=mentee, 
            checker=mentor,
            checked_at=now - timedelta(days=2)
        )
        # Create newer spot check
        newer = SpotCheckFactory(
            student=mentee, 
            checker=mentor,
            checked_at=now - timedelta(days=1)
        )
        
        response = api_client.get(
            '/api/spot-checks/',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 200
        assert len(response.data) == 2
        # Newer should come first (descending order)
        assert response.data[0]['id'] == newer.id
        assert response.data[1]['id'] == older.id


@pytest.mark.django_db
class TestSpotCheckDetail:
    """Tests for spot check detail endpoint."""
    
    def test_mentor_can_view_mentee_spot_check(
        self, api_client, mentor, mentee
    ):
        """Test that a mentor can view a spot check for their mentee."""
        spot_check = SpotCheckFactory(student=mentee, checker=mentor)
        
        response = api_client.get(
            f'/api/spot-checks/{spot_check.id}/',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 200
        assert response.data['id'] == spot_check.id
    
    def test_mentor_cannot_view_non_mentee_spot_check(
        self, api_client, mentor, dept_member
    ):
        """Test that a mentor cannot view a spot check for a non-mentee."""
        spot_check = SpotCheckFactory(student=dept_member, checker=mentor)
        
        response = api_client.get(
            f'/api/spot-checks/{spot_check.id}/',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 400


@pytest.mark.django_db
class TestSpotCheckUpdate:
    """Tests for spot check update endpoint."""
    
    def test_creator_can_update_spot_check(
        self, api_client, mentor, mentee
    ):
        """Test that the creator can update their spot check."""
        spot_check = SpotCheckFactory(student=mentee, checker=mentor)
        
        data = {
            'content': '更新后的抽查内容',
            'score': '95.00',
        }
        
        response = api_client.patch(
            f'/api/spot-checks/{spot_check.id}/',
            data,
            format='json',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 200
        assert response.data['content'] == '更新后的抽查内容'
        assert Decimal(response.data['score']) == Decimal('95.00')


@pytest.mark.django_db
class TestSpotCheckDelete:
    """Tests for spot check delete endpoint."""
    
    def test_creator_can_delete_spot_check(
        self, api_client, mentor, mentee
    ):
        """Test that the creator can delete their spot check."""
        spot_check = SpotCheckFactory(student=mentee, checker=mentor)
        
        response = api_client.delete(
            f'/api/spot-checks/{spot_check.id}/',
            **get_auth_header(mentor, 'MENTOR')
        )
        
        assert response.status_code == 204
