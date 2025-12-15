"""
Unit tests for data scope filtering functionality.

Tests the data scope filtering based on user roles:
- Admin: Full access to all data (Property 39)
- Department Manager: Access only to department members' data (Property 38)
- Mentor: Access only to mentees' data (Property 37)

Requirements: 22.1, 22.2, 22.3
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import Department, Role, UserRole
from apps.users.permissions import (
    get_current_role,
    get_accessible_students,
    get_accessible_student_ids,
    filter_queryset_by_data_scope,
    is_student_in_scope,
    validate_students_in_scope,
)

User = get_user_model()


@pytest.fixture
def department_1(db):
    """Create first department."""
    return Department.objects.create(
        name='一室',
        code='DEPT001',
        description='第一室'
    )


@pytest.fixture
def department_2(db):
    """Create second department."""
    return Department.objects.create(
        name='二室',
        code='DEPT002',
        description='第二室'
    )


@pytest.fixture
def admin_role(db):
    """Get or create admin role."""
    role, _ = Role.objects.get_or_create(
        code='ADMIN',
        defaults={'name': '管理员', 'description': '管理员角色'}
    )
    return role


@pytest.fixture
def mentor_role(db):
    """Get or create mentor role."""
    role, _ = Role.objects.get_or_create(
        code='MENTOR',
        defaults={'name': '导师', 'description': '导师角色'}
    )
    return role


@pytest.fixture
def dept_manager_role(db):
    """Get or create department manager role."""
    role, _ = Role.objects.get_or_create(
        code='DEPT_MANAGER',
        defaults={'name': '室经理', 'description': '室经理角色'}
    )
    return role


@pytest.fixture
def admin_user(db, department_1, admin_role):
    """Create an admin user."""
    user = User.objects.create_user(
        username='admin',
        password='adminpass123',
        employee_id='ADMIN001',
        real_name='管理员',
        department=department_1,
        is_active=True
    )
    UserRole.objects.create(user=user, role=admin_role)
    return user


@pytest.fixture
def mentor_user(db, department_1, mentor_role):
    """Create a mentor user."""
    user = User.objects.create_user(
        username='mentor',
        password='mentorpass123',
        employee_id='MENTOR001',
        real_name='导师',
        department=department_1,
        is_active=True
    )
    UserRole.objects.create(user=user, role=mentor_role)
    return user


@pytest.fixture
def dept_manager_user(db, department_1, dept_manager_role):
    """Create a department manager user."""
    user = User.objects.create_user(
        username='dept_manager',
        password='deptpass123',
        employee_id='DEPTMGR001',
        real_name='室经理',
        department=department_1,
        is_active=True
    )
    UserRole.objects.create(user=user, role=dept_manager_role)
    return user


@pytest.fixture
def student_user(db, department_1):
    """Create a student user (default role)."""
    return User.objects.create_user(
        username='student',
        password='studentpass123',
        employee_id='STU001',
        real_name='学员',
        department=department_1,
        is_active=True
    )


@pytest.fixture
def mentee_1(db, department_1, mentor_user):
    """Create a mentee under the mentor."""
    user = User.objects.create_user(
        username='mentee1',
        password='menteepass123',
        employee_id='MENTEE001',
        real_name='学员1',
        department=department_1,
        mentor=mentor_user,
        is_active=True
    )
    return user


@pytest.fixture
def mentee_2(db, department_1, mentor_user):
    """Create another mentee under the mentor."""
    user = User.objects.create_user(
        username='mentee2',
        password='menteepass123',
        employee_id='MENTEE002',
        real_name='学员2',
        department=department_1,
        mentor=mentor_user,
        is_active=True
    )
    return user


@pytest.fixture
def dept1_member(db, department_1):
    """Create a member in department 1."""
    return User.objects.create_user(
        username='dept1_member',
        password='memberpass123',
        employee_id='DEPT1MEM001',
        real_name='一室成员',
        department=department_1,
        is_active=True
    )


@pytest.fixture
def dept2_member(db, department_2):
    """Create a member in department 2."""
    return User.objects.create_user(
        username='dept2_member',
        password='memberpass123',
        employee_id='DEPT2MEM001',
        real_name='二室成员',
        department=department_2,
        is_active=True
    )


class TestGetCurrentRole:
    """Tests for get_current_role function."""
    
    def test_returns_admin_for_admin_user(self, admin_user):
        """Admin user should return ADMIN role."""
        role = get_current_role(admin_user)
        assert role == 'ADMIN'
    
    def test_returns_mentor_for_mentor_user(self, mentor_user):
        """Mentor user should return MENTOR role."""
        role = get_current_role(mentor_user)
        assert role == 'MENTOR'
    
    def test_returns_dept_manager_for_dept_manager_user(self, dept_manager_user):
        """Department manager should return DEPT_MANAGER role."""
        role = get_current_role(dept_manager_user)
        assert role == 'DEPT_MANAGER'
    
    def test_returns_student_for_student_user(self, student_user):
        """Student user should return STUDENT role."""
        role = get_current_role(student_user)
        assert role == 'STUDENT'
    
    def test_respects_current_role_attribute(self, admin_user):
        """Should respect current_role attribute if set."""
        admin_user.current_role = 'STUDENT'
        role = get_current_role(admin_user)
        assert role == 'STUDENT'


class TestGetAccessibleStudents:
    """
    Tests for get_accessible_students function.
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    
    def test_admin_can_access_all_students(
        self, admin_user, mentee_1, mentee_2, dept1_member, dept2_member
    ):
        """
        Admin should have access to all active students.
        
        Property 39: 管理员全平台数据访问
        Requirements: 22.3
        """
        accessible = get_accessible_students(admin_user)
        accessible_ids = set(accessible.values_list('id', flat=True))
        
        # Admin should see all users
        assert mentee_1.id in accessible_ids
        assert mentee_2.id in accessible_ids
        assert dept1_member.id in accessible_ids
        assert dept2_member.id in accessible_ids
    
    def test_mentor_can_only_access_mentees(
        self, mentor_user, mentee_1, mentee_2, dept1_member, dept2_member
    ):
        """
        Mentor should only have access to their mentees.
        
        Property 37: 导师数据范围限制
        Requirements: 22.1
        """
        accessible = get_accessible_students(mentor_user)
        accessible_ids = set(accessible.values_list('id', flat=True))
        
        # Mentor should only see their mentees
        assert mentee_1.id in accessible_ids
        assert mentee_2.id in accessible_ids
        # Should not see other users
        assert dept1_member.id not in accessible_ids
        assert dept2_member.id not in accessible_ids
    
    def test_dept_manager_can_only_access_department_members(
        self, dept_manager_user, mentee_1, mentee_2, dept1_member, dept2_member
    ):
        """
        Department manager should only have access to department members.
        
        Property 38: 室经理数据范围限制
        Requirements: 22.2
        """
        accessible = get_accessible_students(dept_manager_user)
        accessible_ids = set(accessible.values_list('id', flat=True))
        
        # Dept manager should see department 1 members
        assert mentee_1.id in accessible_ids
        assert mentee_2.id in accessible_ids
        assert dept1_member.id in accessible_ids
        # Should not see department 2 members
        assert dept2_member.id not in accessible_ids
        # Should not see themselves
        assert dept_manager_user.id not in accessible_ids
    
    def test_student_has_no_access(self, student_user, mentee_1):
        """Student should have no access to other students."""
        accessible = get_accessible_students(student_user)
        assert accessible.count() == 0
    
    def test_inactive_students_excluded(self, mentor_user, mentee_1):
        """Inactive students should be excluded."""
        mentee_1.is_active = False
        mentee_1.save()
        
        accessible = get_accessible_students(mentor_user)
        accessible_ids = set(accessible.values_list('id', flat=True))
        
        assert mentee_1.id not in accessible_ids


class TestIsStudentInScope:
    """
    Tests for is_student_in_scope function.
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    
    def test_admin_can_access_any_student(
        self, admin_user, mentee_1, dept2_member
    ):
        """Admin should be able to access any student."""
        assert is_student_in_scope(admin_user, mentee_1.id) is True
        assert is_student_in_scope(admin_user, dept2_member.id) is True
    
    def test_mentor_can_access_mentee(self, mentor_user, mentee_1):
        """Mentor should be able to access their mentee."""
        assert is_student_in_scope(mentor_user, mentee_1.id) is True
    
    def test_mentor_cannot_access_non_mentee(self, mentor_user, dept1_member):
        """Mentor should not be able to access non-mentee."""
        assert is_student_in_scope(mentor_user, dept1_member.id) is False
    
    def test_dept_manager_can_access_department_member(
        self, dept_manager_user, dept1_member
    ):
        """Department manager should be able to access department member."""
        assert is_student_in_scope(dept_manager_user, dept1_member.id) is True
    
    def test_dept_manager_cannot_access_other_department_member(
        self, dept_manager_user, dept2_member
    ):
        """Department manager should not be able to access other department member."""
        assert is_student_in_scope(dept_manager_user, dept2_member.id) is False


class TestValidateStudentsInScope:
    """
    Tests for validate_students_in_scope function.
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    
    def test_admin_all_students_valid(
        self, admin_user, mentee_1, mentee_2, dept2_member
    ):
        """Admin should validate all students as in scope."""
        student_ids = [mentee_1.id, mentee_2.id, dept2_member.id]
        is_valid, invalid_ids = validate_students_in_scope(admin_user, student_ids)
        
        assert is_valid is True
        assert len(invalid_ids) == 0
    
    def test_mentor_mentees_valid(self, mentor_user, mentee_1, mentee_2):
        """Mentor should validate mentees as in scope."""
        student_ids = [mentee_1.id, mentee_2.id]
        is_valid, invalid_ids = validate_students_in_scope(mentor_user, student_ids)
        
        assert is_valid is True
        assert len(invalid_ids) == 0
    
    def test_mentor_non_mentees_invalid(
        self, mentor_user, mentee_1, dept1_member
    ):
        """Mentor should mark non-mentees as invalid."""
        student_ids = [mentee_1.id, dept1_member.id]
        is_valid, invalid_ids = validate_students_in_scope(mentor_user, student_ids)
        
        assert is_valid is False
        assert dept1_member.id in invalid_ids
        assert mentee_1.id not in invalid_ids
    
    def test_dept_manager_department_members_valid(
        self, dept_manager_user, mentee_1, dept1_member
    ):
        """Department manager should validate department members as in scope."""
        student_ids = [mentee_1.id, dept1_member.id]
        is_valid, invalid_ids = validate_students_in_scope(dept_manager_user, student_ids)
        
        assert is_valid is True
        assert len(invalid_ids) == 0
    
    def test_dept_manager_other_department_invalid(
        self, dept_manager_user, dept1_member, dept2_member
    ):
        """Department manager should mark other department members as invalid."""
        student_ids = [dept1_member.id, dept2_member.id]
        is_valid, invalid_ids = validate_students_in_scope(dept_manager_user, student_ids)
        
        assert is_valid is False
        assert dept2_member.id in invalid_ids
        assert dept1_member.id not in invalid_ids
    
    def test_empty_list_is_valid(self, mentor_user):
        """Empty student list should be valid."""
        is_valid, invalid_ids = validate_students_in_scope(mentor_user, [])
        
        assert is_valid is True
        assert len(invalid_ids) == 0


class TestFilterQuerysetByDataScope:
    """
    Tests for filter_queryset_by_data_scope function.
    
    Requirements: 22.1, 22.2, 22.3
    Properties: 37, 38, 39
    """
    
    def test_admin_gets_all_data(
        self, admin_user, mentee_1, mentee_2, dept1_member, dept2_member
    ):
        """Admin should get all data from queryset."""
        queryset = User.objects.filter(is_active=True)
        filtered = filter_queryset_by_data_scope(queryset, admin_user, student_field=None)
        
        # Admin should see all users in the queryset
        filtered_ids = set(filtered.values_list('id', flat=True))
        assert mentee_1.id in filtered_ids
        assert mentee_2.id in filtered_ids
        assert dept1_member.id in filtered_ids
        assert dept2_member.id in filtered_ids
    
    def test_mentor_gets_only_mentees(
        self, mentor_user, mentee_1, mentee_2, dept1_member
    ):
        """Mentor should only get mentees from queryset."""
        queryset = User.objects.filter(is_active=True)
        # For direct User queryset, we need to filter by mentor field
        mentor_user.current_role = 'MENTOR'
        filtered = filter_queryset_by_data_scope(queryset, mentor_user, student_field=None)
        
        filtered_ids = set(filtered.values_list('id', flat=True))
        assert mentee_1.id in filtered_ids
        assert mentee_2.id in filtered_ids
        assert dept1_member.id not in filtered_ids
    
    def test_dept_manager_gets_only_department_members(
        self, dept_manager_user, mentee_1, dept1_member, dept2_member
    ):
        """Department manager should only get department members from queryset."""
        queryset = User.objects.filter(is_active=True)
        dept_manager_user.current_role = 'DEPT_MANAGER'
        filtered = filter_queryset_by_data_scope(queryset, dept_manager_user, student_field=None)
        
        filtered_ids = set(filtered.values_list('id', flat=True))
        assert mentee_1.id in filtered_ids
        assert dept1_member.id in filtered_ids
        assert dept2_member.id not in filtered_ids
