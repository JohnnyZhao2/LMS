"""
Property-based tests for Permission and Data Scope Filtering.

Tests the following correctness properties:
- Property 37: 导师数据范围限制
- Property 38: 室经理数据范围限制
- Property 39: 管理员全平台数据访问
- Property 40: 无权限请求拒绝
- Property 41: 团队经理只读访问

**Feature: lms-backend**
**Validates: Requirements 22.1, 22.2, 22.3, 22.5, 21.3**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from rest_framework.test import APIRequestFactory
from rest_framework import status

from apps.users.models import User, Role, UserRole, Department
from apps.users.permissions import (
    get_accessible_students,
    get_accessible_student_ids,
    is_student_in_scope,
    validate_students_in_scope,
    filter_queryset_by_data_scope,
    IsTeamManagerReadOnly,
    IsOwnerOrAdmin,
    CanAccessMenteeData,
)


# Suppress function-scoped fixture health check since our fixtures are
# intentionally shared across hypothesis iterations (they set up static data)
HYPOTHESIS_SETTINGS = {
    'max_examples': 100,
    'deadline': None,
    'suppress_health_check': [HealthCheck.function_scoped_fixture]
}


# ============ Strategies ============

@st.composite
def valid_username_strategy(draw):
    """Generate valid usernames: alphanumeric + underscore, 3-30 chars."""
    first_char = draw(st.sampled_from('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'))
    rest = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
        min_size=2,
        max_size=29
    ))
    return first_char + rest


@st.composite
def valid_employee_id_strategy(draw):
    """Generate valid employee IDs: alphanumeric, 5-20 chars."""
    return draw(st.text(
        alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        min_size=5,
        max_size=20
    ))


# Strategy for generating number of students
num_students_strategy = st.integers(min_value=1, max_value=5)


# Strategy for HTTP methods
safe_methods_strategy = st.sampled_from(['GET', 'HEAD', 'OPTIONS'])
unsafe_methods_strategy = st.sampled_from(['POST', 'PUT', 'PATCH', 'DELETE'])


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


@pytest.fixture
def request_factory():
    """Return an API request factory."""
    return APIRequestFactory()


# ============ Property Tests ============


class TestProperty37MentorDataScopeRestriction:
    """
    **Feature: lms-backend, Property 37: 导师数据范围限制**
    
    *For any* 导师的学员数据查询，结果应该只包含 mentor_id 等于该导师 ID 的学员。
    **Validates: Requirements 22.1**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_mentees=st.integers(min_value=1, max_value=5),
        num_other_students=st.integers(min_value=1, max_value=5),
    )
    def test_mentor_only_sees_own_mentees(
        self,
        setup_roles,
        setup_departments,
        num_mentees,
        num_other_students,
    ):
        """
        **Feature: lms-backend, Property 37: 导师数据范围限制**
        
        For any mentor querying student data, the results should only
        contain students where mentor_id equals the mentor's ID.
        
        **Validates: Requirements 22.1**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            username='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        created_users = [mentor]
        mentee_ids = set()
        
        try:
            # Create mentees under this mentor
            for i in range(num_mentees):
                mentee = User.objects.create_user(
                    username=f'mentee_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'MTE_{unique_suffix}_{i}',
                    username=f'学员{i}',
                    department=dept,
                    mentor=mentor,
                )
                created_users.append(mentee)
                mentee_ids.add(mentee.id)
            
            # Create other students (not under this mentor)
            for i in range(num_other_students):
                other = User.objects.create_user(
                    username=f'other_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'OTH_{unique_suffix}_{i}',
                    username=f'其他学员{i}',
                    department=dept,
                    mentor=None,  # No mentor
                )
                created_users.append(other)
            
            # Property assertion: mentor should only see their mentees
            accessible = get_accessible_students(mentor, current_role='MENTOR')
            accessible_ids = set(accessible.values_list('id', flat=True))
            
            # All accessible students should be mentees
            assert accessible_ids == mentee_ids, \
                f"Mentor should only see mentees. Expected {mentee_ids}, got {accessible_ids}"
            
            # Verify using is_student_in_scope
            for mentee_id in mentee_ids:
                assert is_student_in_scope(mentor, mentee_id, current_role='MENTOR'), \
                    f"Mentee {mentee_id} should be in scope for mentor"
            
        finally:
            # Cleanup
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_mentees=st.integers(min_value=0, max_value=5),
        num_other_students=st.integers(min_value=1, max_value=5),
    )
    def test_mentor_cannot_access_non_mentees(
        self,
        setup_roles,
        setup_departments,
        num_mentees,
        num_other_students,
    ):
        """
        **Feature: lms-backend, Property 37: 导师数据范围限制**
        
        For any mentor, students who are not their mentees should not
        be accessible.
        
        **Validates: Requirements 22.1**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            username='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        created_users = [mentor]
        other_student_ids = set()
        
        try:
            # Create mentees (if any)
            for i in range(num_mentees):
                mentee = User.objects.create_user(
                    username=f'mentee_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'MTE_{unique_suffix}_{i}',
                    username=f'学员{i}',
                    department=dept,
                    mentor=mentor,
                )
                created_users.append(mentee)
            
            # Create other students (not under this mentor)
            for i in range(num_other_students):
                other = User.objects.create_user(
                    username=f'other_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'OTH_{unique_suffix}_{i}',
                    username=f'其他学员{i}',
                    department=dept,
                    mentor=None,
                )
                created_users.append(other)
                other_student_ids.add(other.id)
            
            # Property assertion: mentor should NOT see non-mentees
            accessible_ids = get_accessible_student_ids(mentor, current_role='MENTOR')
            
            for other_id in other_student_ids:
                assert other_id not in accessible_ids, \
                    f"Non-mentee {other_id} should not be accessible to mentor"
                assert not is_student_in_scope(mentor, other_id, current_role='MENTOR'), \
                    f"Non-mentee {other_id} should not be in scope for mentor"
            
        finally:
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()



class TestProperty38DeptManagerDataScopeRestriction:
    """
    **Feature: lms-backend, Property 38: 室经理数据范围限制**
    
    *For any* 室经理的学员数据查询，结果应该只包含 department_id 等于该室经理所在室的学员。
    **Validates: Requirements 22.2**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_dept_members=st.integers(min_value=1, max_value=5),
        num_other_dept_members=st.integers(min_value=1, max_value=5),
    )
    def test_dept_manager_only_sees_department_members(
        self,
        setup_roles,
        setup_departments,
        num_dept_members,
        num_other_dept_members,
    ):
        """
        **Feature: lms-backend, Property 38: 室经理数据范围限制**
        
        For any department manager querying student data, the results
        should only contain students in the same department.
        
        **Validates: Requirements 22.2**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept1 = setup_departments['dept1']
        dept2 = setup_departments['dept2']
        
        # Create department manager
        dept_manager = User.objects.create_user(
            username=f'deptmgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'DM_{unique_suffix}',
            username='室经理',
            department=dept1,
        )
        UserRole.objects.get_or_create(user=dept_manager, role=setup_roles['DEPT_MANAGER'])
        
        created_users = [dept_manager]
        dept1_member_ids = set()
        
        try:
            # Create members in dept1
            for i in range(num_dept_members):
                member = User.objects.create_user(
                    username=f'dept1_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D1M_{unique_suffix}_{i}',
                    username=f'一室成员{i}',
                    department=dept1,
                )
                created_users.append(member)
                dept1_member_ids.add(member.id)
            
            # Create members in dept2 (other department)
            for i in range(num_other_dept_members):
                other = User.objects.create_user(
                    username=f'dept2_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D2M_{unique_suffix}_{i}',
                    username=f'二室成员{i}',
                    department=dept2,
                )
                created_users.append(other)
            
            # Property assertion: dept manager should only see dept1 members
            accessible = get_accessible_students(dept_manager, current_role='DEPT_MANAGER')
            accessible_ids = set(accessible.values_list('id', flat=True))
            
            # All accessible students should be in dept1 (excluding self)
            assert accessible_ids == dept1_member_ids, \
                f"Dept manager should only see dept members. Expected {dept1_member_ids}, got {accessible_ids}"
            
        finally:
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_other_dept_members=st.integers(min_value=1, max_value=5),
    )
    def test_dept_manager_cannot_access_other_department_members(
        self,
        setup_roles,
        setup_departments,
        num_other_dept_members,
    ):
        """
        **Feature: lms-backend, Property 38: 室经理数据范围限制**
        
        For any department manager, students in other departments
        should not be accessible.
        
        **Validates: Requirements 22.2**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept1 = setup_departments['dept1']
        dept2 = setup_departments['dept2']
        
        # Create department manager in dept1
        dept_manager = User.objects.create_user(
            username=f'deptmgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'DM_{unique_suffix}',
            username='室经理',
            department=dept1,
        )
        UserRole.objects.get_or_create(user=dept_manager, role=setup_roles['DEPT_MANAGER'])
        
        created_users = [dept_manager]
        other_dept_member_ids = set()
        
        try:
            # Create members in dept2 (other department)
            for i in range(num_other_dept_members):
                other = User.objects.create_user(
                    username=f'dept2_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D2M_{unique_suffix}_{i}',
                    username=f'二室成员{i}',
                    department=dept2,
                )
                created_users.append(other)
                other_dept_member_ids.add(other.id)
            
            # Property assertion: dept manager should NOT see other dept members
            accessible_ids = get_accessible_student_ids(dept_manager, current_role='DEPT_MANAGER')
            
            for other_id in other_dept_member_ids:
                assert other_id not in accessible_ids, \
                    f"Other dept member {other_id} should not be accessible"
                assert not is_student_in_scope(dept_manager, other_id, current_role='DEPT_MANAGER'), \
                    f"Other dept member {other_id} should not be in scope"
            
        finally:
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()



class TestProperty39AdminFullPlatformAccess:
    """
    **Feature: lms-backend, Property 39: 管理员全平台数据访问**
    
    *For any* 管理员的数据查询，结果应该包含全平台所有数据。
    **Validates: Requirements 22.3, 20.1**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_dept1_members=st.integers(min_value=1, max_value=3),
        num_dept2_members=st.integers(min_value=1, max_value=3),
        num_mentees=st.integers(min_value=1, max_value=3),
    )
    def test_admin_can_access_all_students(
        self,
        setup_roles,
        setup_departments,
        num_dept1_members,
        num_dept2_members,
        num_mentees,
    ):
        """
        **Feature: lms-backend, Property 39: 管理员全平台数据访问**
        
        For any admin querying student data, the results should include
        all active students across all departments.
        
        **Validates: Requirements 22.3, 20.1**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept1 = setup_departments['dept1']
        dept2 = setup_departments['dept2']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=dept1,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create a mentor for mentees
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            username='导师',
            department=dept1,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        created_users = [admin, mentor]
        all_student_ids = set()
        
        try:
            # Create members in dept1
            for i in range(num_dept1_members):
                member = User.objects.create_user(
                    username=f'dept1_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D1M_{unique_suffix}_{i}',
                    username=f'一室成员{i}',
                    department=dept1,
                )
                created_users.append(member)
                all_student_ids.add(member.id)
            
            # Create members in dept2
            for i in range(num_dept2_members):
                member = User.objects.create_user(
                    username=f'dept2_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D2M_{unique_suffix}_{i}',
                    username=f'二室成员{i}',
                    department=dept2,
                )
                created_users.append(member)
                all_student_ids.add(member.id)
            
            # Create mentees
            for i in range(num_mentees):
                mentee = User.objects.create_user(
                    username=f'mentee_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'MTE_{unique_suffix}_{i}',
                    username=f'学员{i}',
                    department=dept1,
                    mentor=mentor,
                )
                created_users.append(mentee)
                all_student_ids.add(mentee.id)
            
            # Property assertion: admin should see all students
            accessible = get_accessible_students(admin, current_role='ADMIN')
            accessible_ids = set(accessible.values_list('id', flat=True))
            
            # Admin should see all created students
            assert all_student_ids.issubset(accessible_ids), \
                f"Admin should see all students. Missing: {all_student_ids - accessible_ids}"
            
            # Verify each student is in scope
            for student_id in all_student_ids:
                assert is_student_in_scope(admin, student_id, current_role='ADMIN'), \
                    f"Student {student_id} should be in scope for admin"
            
        finally:
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        student_ids_to_validate=st.lists(
            st.integers(min_value=1, max_value=1000),
            min_size=1,
            max_size=10,
            unique=True
        ),
    )
    def test_admin_validates_all_students_in_scope(
        self,
        setup_roles,
        setup_departments,
        student_ids_to_validate,
    ):
        """
        **Feature: lms-backend, Property 39: 管理员全平台数据访问**
        
        For any admin validating student IDs, all existing active students
        should be validated as in scope.
        
        **Validates: Requirements 22.3**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create admin
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=dept,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        created_users = [admin]
        created_student_ids = []
        
        try:
            # Create some students
            for i in range(3):
                student = User.objects.create_user(
                    username=f'student_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'STU_{unique_suffix}_{i}',
                    username=f'学员{i}',
                    department=dept,
                )
                created_users.append(student)
                created_student_ids.append(student.id)
            
            # Property assertion: admin should validate all created students as in scope
            is_valid, invalid_ids = validate_students_in_scope(
                admin, created_student_ids, current_role='ADMIN'
            )
            
            assert is_valid is True, \
                f"Admin should validate all students as in scope. Invalid: {invalid_ids}"
            assert len(invalid_ids) == 0, \
                f"No students should be invalid for admin. Got: {invalid_ids}"
            
        finally:
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()



class TestProperty40UnauthorizedRequestRejection:
    """
    **Feature: lms-backend, Property 40: 无权限请求拒绝**
    
    *For any* 用户对无权访问的资源的请求，应该返回 403 状态码。
    **Validates: Requirements 22.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_other_students=st.integers(min_value=1, max_value=5),
    )
    def test_mentor_rejected_for_non_mentee_access(
        self,
        setup_roles,
        setup_departments,
        num_other_students,
        request_factory,
    ):
        """
        **Feature: lms-backend, Property 40: 无权限请求拒绝**
        
        For any mentor trying to access non-mentee data, the permission
        check should return False (which results in 403).
        
        **Validates: Requirements 22.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            username='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        mentor.current_role = 'MENTOR'
        
        created_users = [mentor]
        
        try:
            # Create students not under this mentor
            for i in range(num_other_students):
                other = User.objects.create_user(
                    username=f'other_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'OTH_{unique_suffix}_{i}',
                    username=f'其他学员{i}',
                    department=dept,
                    mentor=None,
                )
                created_users.append(other)
                
                # Property assertion: permission check should fail
                permission = CanAccessMenteeData()
                request = request_factory.get('/api/test/')
                request.user = mentor
                
                # has_object_permission should return False for non-mentee
                assert permission.has_object_permission(request, None, other) is False, \
                    f"Mentor should not have permission to access non-mentee {other.id}"
            
        finally:
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_other_dept_members=st.integers(min_value=1, max_value=5),
    )
    def test_dept_manager_rejected_for_other_dept_access(
        self,
        setup_roles,
        setup_departments,
        num_other_dept_members,
        request_factory,
    ):
        """
        **Feature: lms-backend, Property 40: 无权限请求拒绝**
        
        For any department manager trying to access other department's
        data, the permission check should return False (which results in 403).
        
        **Validates: Requirements 22.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept1 = setup_departments['dept1']
        dept2 = setup_departments['dept2']
        
        # Create department manager in dept1
        dept_manager = User.objects.create_user(
            username=f'deptmgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'DM_{unique_suffix}',
            username='室经理',
            department=dept1,
        )
        UserRole.objects.get_or_create(user=dept_manager, role=setup_roles['DEPT_MANAGER'])
        dept_manager.current_role = 'DEPT_MANAGER'
        
        created_users = [dept_manager]
        
        try:
            # Create members in dept2 (other department)
            for i in range(num_other_dept_members):
                other = User.objects.create_user(
                    username=f'dept2_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D2M_{unique_suffix}_{i}',
                    username=f'二室成员{i}',
                    department=dept2,
                )
                created_users.append(other)
                
                # Property assertion: permission check should fail
                permission = CanAccessMenteeData()
                request = request_factory.get('/api/test/')
                request.user = dept_manager
                
                # has_object_permission should return False for other dept member
                assert permission.has_object_permission(request, None, other) is False, \
                    f"Dept manager should not have permission to access other dept member {other.id}"
            
        finally:
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(data=st.data())
    def test_student_rejected_for_other_student_access(
        self,
        setup_roles,
        setup_departments,
        data,
        request_factory,
    ):
        """
        **Feature: lms-backend, Property 40: 无权限请求拒绝**
        
        For any student trying to access other student's data,
        the permission check should return False.
        
        **Validates: Requirements 22.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create a student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=dept,
        )
        student.current_role = 'STUDENT'
        
        # Create another student
        other_student = User.objects.create_user(
            username=f'other_student_{unique_suffix}',
            password='testpass123',
            employee_id=f'OSTU_{unique_suffix}',
            username='其他学员',
            department=dept,
        )
        
        try:
            # Property assertion: student should not have permission
            permission = CanAccessMenteeData()
            request = request_factory.get('/api/test/')
            request.user = student
            
            # has_permission should return False for student role
            assert permission.has_permission(request, None) is False, \
                "Student should not have permission to access mentee data"
            
        finally:
            User.objects.filter(pk__in=[student.pk, other_student.pk]).delete()



class TestProperty41TeamManagerReadOnlyAccess:
    """
    **Feature: lms-backend, Property 41: 团队经理只读访问**
    
    *For any* 团队经理的写操作请求（POST/PUT/PATCH/DELETE），应该返回 403 错误。
    **Validates: Requirements 21.3**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(method=safe_methods_strategy)
    def test_team_manager_allowed_safe_methods(
        self,
        setup_roles,
        setup_departments,
        method,
        request_factory,
    ):
        """
        **Feature: lms-backend, Property 41: 团队经理只读访问**
        
        For any team manager using safe HTTP methods (GET, HEAD, OPTIONS),
        the permission check should return True.
        
        **Validates: Requirements 21.3**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create team manager
        team_manager = User.objects.create_user(
            username=f'teammgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'TM_{unique_suffix}',
            username='团队经理',
            department=dept,
        )
        UserRole.objects.get_or_create(user=team_manager, role=setup_roles['TEAM_MANAGER'])
        team_manager.current_role = 'TEAM_MANAGER'
        
        try:
            # Create request with safe method
            if method == 'GET':
                request = request_factory.get('/api/test/')
            elif method == 'HEAD':
                request = request_factory.head('/api/test/')
            else:  # OPTIONS
                request = request_factory.options('/api/test/')
            
            request.user = team_manager
            
            # Property assertion: safe methods should be allowed
            permission = IsTeamManagerReadOnly()
            assert permission.has_permission(request, None) is True, \
                f"Team manager should be allowed {method} method"
            
        finally:
            User.objects.filter(pk=team_manager.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(method=unsafe_methods_strategy)
    def test_team_manager_rejected_unsafe_methods(
        self,
        setup_roles,
        setup_departments,
        method,
        request_factory,
    ):
        """
        **Feature: lms-backend, Property 41: 团队经理只读访问**
        
        For any team manager using unsafe HTTP methods (POST, PUT, PATCH, DELETE),
        the permission check should return False (resulting in 403).
        
        **Validates: Requirements 21.3**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create team manager
        team_manager = User.objects.create_user(
            username=f'teammgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'TM_{unique_suffix}',
            username='团队经理',
            department=dept,
        )
        UserRole.objects.get_or_create(user=team_manager, role=setup_roles['TEAM_MANAGER'])
        team_manager.current_role = 'TEAM_MANAGER'
        
        try:
            # Create request with unsafe method
            if method == 'POST':
                request = request_factory.post('/api/test/', {})
            elif method == 'PUT':
                request = request_factory.put('/api/test/', {})
            elif method == 'PATCH':
                request = request_factory.patch('/api/test/', {})
            else:  # DELETE
                request = request_factory.delete('/api/test/')
            
            request.user = team_manager
            
            # Property assertion: unsafe methods should be rejected
            permission = IsTeamManagerReadOnly()
            assert permission.has_permission(request, None) is False, \
                f"Team manager should be rejected for {method} method"
            
        finally:
            User.objects.filter(pk=team_manager.pk).delete()

    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(
        num_safe_requests=st.integers(min_value=1, max_value=5),
        num_unsafe_requests=st.integers(min_value=1, max_value=5),
    )
    def test_team_manager_mixed_method_sequence(
        self,
        setup_roles,
        setup_departments,
        num_safe_requests,
        num_unsafe_requests,
        request_factory,
    ):
        """
        **Feature: lms-backend, Property 41: 团队经理只读访问**
        
        For any sequence of requests from a team manager, safe methods
        should always be allowed and unsafe methods should always be rejected.
        
        **Validates: Requirements 21.3**
        """
        import uuid
        import random
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create team manager
        team_manager = User.objects.create_user(
            username=f'teammgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'TM_{unique_suffix}',
            username='团队经理',
            department=dept,
        )
        UserRole.objects.get_or_create(user=team_manager, role=setup_roles['TEAM_MANAGER'])
        team_manager.current_role = 'TEAM_MANAGER'
        
        try:
            permission = IsTeamManagerReadOnly()
            safe_methods = ['GET', 'HEAD', 'OPTIONS']
            unsafe_methods = ['POST', 'PUT', 'PATCH', 'DELETE']
            
            # Test safe methods
            for _ in range(num_safe_requests):
                method = random.choice(safe_methods)
                if method == 'GET':
                    request = request_factory.get('/api/test/')
                elif method == 'HEAD':
                    request = request_factory.head('/api/test/')
                else:
                    request = request_factory.options('/api/test/')
                request.user = team_manager
                
                assert permission.has_permission(request, None) is True, \
                    f"Safe method {method} should be allowed"
            
            # Test unsafe methods
            for _ in range(num_unsafe_requests):
                method = random.choice(unsafe_methods)
                if method == 'POST':
                    request = request_factory.post('/api/test/', {})
                elif method == 'PUT':
                    request = request_factory.put('/api/test/', {})
                elif method == 'PATCH':
                    request = request_factory.patch('/api/test/', {})
                else:
                    request = request_factory.delete('/api/test/')
                request.user = team_manager
                
                assert permission.has_permission(request, None) is False, \
                    f"Unsafe method {method} should be rejected"
            
        finally:
            User.objects.filter(pk=team_manager.pk).delete()
