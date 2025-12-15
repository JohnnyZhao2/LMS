"""
Property-based tests for Spot Check Module.

Tests the following correctness properties:
- Property 35: 抽查学员范围限制
- Property 36: 抽查记录时间排序

**Feature: lms-backend**
**Validates: Requirements 14.2, 14.3, 14.4**
"""
import pytest
from decimal import Decimal
from datetime import timedelta
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st
from django.utils import timezone

from apps.users.models import User, Role, UserRole, Department
from apps.spot_checks.models import SpotCheck


# Suppress function-scoped fixture health check since our fixtures are
# intentionally shared across hypothesis iterations (they set up static data)
HYPOTHESIS_SETTINGS = {
    'max_examples': 100,
    'deadline': None,
    'suppress_health_check': [HealthCheck.function_scoped_fixture]
}


# ============ Strategies ============

# Strategy for generating number of students/records
num_items_strategy = st.integers(min_value=1, max_value=5)

# Strategy for generating spot check scores (0-100)
score_strategy = st.decimals(min_value=0, max_value=100, places=2)

# Strategy for generating time offsets in days (for ordering tests)
time_offset_strategy = st.integers(min_value=1, max_value=30)


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


# ============ Property Tests ============


class TestProperty35SpotCheckStudentScopeRestriction:
    """
    **Feature: lms-backend, Property 35: 抽查学员范围限制**
    
    *For any* 导师创建的抽查记录，被抽查学员必须是该导师的名下学员；
    室经理创建的抽查记录，被抽查学员必须是本室成员。
    **Validates: Requirements 14.2, 14.3**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_mentees=st.integers(min_value=1, max_value=5),
        num_other_students=st.integers(min_value=1, max_value=5),
        score=score_strategy,
    )
    def test_mentor_can_only_create_spot_check_for_mentees(
        self,
        setup_roles,
        setup_departments,
        num_mentees,
        num_other_students,
        score,
    ):
        """
        **Feature: lms-backend, Property 35: 抽查学员范围限制**
        
        For any mentor creating a spot check, the student must be
        one of their mentees (mentor_id equals the mentor's ID).
        
        **Validates: Requirements 14.2**
        """
        import uuid
        from apps.spot_checks.serializers import SpotCheckCreateSerializer
        from rest_framework.test import APIRequestFactory
        
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            real_name='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        mentor.current_role = 'MENTOR'
        
        created_users = [mentor]
        mentees = []
        other_students = []
        
        try:
            # Create mentees under this mentor
            for i in range(num_mentees):
                mentee = User.objects.create_user(
                    username=f'mentee_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'MTE_{unique_suffix}_{i}',
                    real_name=f'学员{i}',
                    department=dept,
                    mentor=mentor,
                )
                created_users.append(mentee)
                mentees.append(mentee)
            
            # Create other students (not under this mentor)
            for i in range(num_other_students):
                other = User.objects.create_user(
                    username=f'other_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'OTH_{unique_suffix}_{i}',
                    real_name=f'其他学员{i}',
                    department=dept,
                    mentor=None,
                )
                created_users.append(other)
                other_students.append(other)
            
            # Create mock request
            factory = APIRequestFactory()
            request = factory.post('/api/spot-checks/')
            request.user = mentor
            
            # Property assertion 1: Mentor CAN create spot check for mentees
            for mentee in mentees:
                data = {
                    'student': mentee.id,
                    'content': '抽查内容',
                    'score': str(score),
                    'checked_at': timezone.now().isoformat(),
                }
                serializer = SpotCheckCreateSerializer(
                    data=data,
                    context={'request': request}
                )
                assert serializer.is_valid(), \
                    f"Mentor should be able to create spot check for mentee {mentee.id}. Errors: {serializer.errors}"
            
            # Property assertion 2: Mentor CANNOT create spot check for non-mentees
            for other in other_students:
                data = {
                    'student': other.id,
                    'content': '抽查内容',
                    'score': str(score),
                    'checked_at': timezone.now().isoformat(),
                }
                serializer = SpotCheckCreateSerializer(
                    data=data,
                    context={'request': request}
                )
                assert not serializer.is_valid(), \
                    f"Mentor should NOT be able to create spot check for non-mentee {other.id}"
                assert 'student' in serializer.errors, \
                    "Error should be on 'student' field"
            
        finally:
            # Cleanup
            SpotCheck.objects.filter(checker=mentor).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()

    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_dept_members=st.integers(min_value=1, max_value=5),
        num_other_dept_members=st.integers(min_value=1, max_value=5),
        score=score_strategy,
    )
    def test_dept_manager_can_only_create_spot_check_for_dept_members(
        self,
        setup_roles,
        setup_departments,
        num_dept_members,
        num_other_dept_members,
        score,
    ):
        """
        **Feature: lms-backend, Property 35: 抽查学员范围限制**
        
        For any department manager creating a spot check, the student
        must be in the same department.
        
        **Validates: Requirements 14.3**
        """
        import uuid
        from apps.spot_checks.serializers import SpotCheckCreateSerializer
        from rest_framework.test import APIRequestFactory
        
        unique_suffix = uuid.uuid4().hex[:8]
        dept1 = setup_departments['dept1']
        dept2 = setup_departments['dept2']
        
        # Create department manager
        dept_manager = User.objects.create_user(
            username=f'deptmgr_{unique_suffix}',
            password='testpass123',
            employee_id=f'DM_{unique_suffix}',
            real_name='室经理',
            department=dept1,
        )
        UserRole.objects.get_or_create(user=dept_manager, role=setup_roles['DEPT_MANAGER'])
        dept_manager.current_role = 'DEPT_MANAGER'
        
        created_users = [dept_manager]
        dept_members = []
        other_dept_members = []
        
        try:
            # Create members in dept1 (same department)
            for i in range(num_dept_members):
                member = User.objects.create_user(
                    username=f'dept1_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D1M_{unique_suffix}_{i}',
                    real_name=f'一室成员{i}',
                    department=dept1,
                )
                created_users.append(member)
                dept_members.append(member)
            
            # Create members in dept2 (other department)
            for i in range(num_other_dept_members):
                other = User.objects.create_user(
                    username=f'dept2_member_{unique_suffix}_{i}',
                    password='testpass123',
                    employee_id=f'D2M_{unique_suffix}_{i}',
                    real_name=f'二室成员{i}',
                    department=dept2,
                )
                created_users.append(other)
                other_dept_members.append(other)
            
            # Create mock request
            factory = APIRequestFactory()
            request = factory.post('/api/spot-checks/')
            request.user = dept_manager
            
            # Property assertion 1: Dept manager CAN create spot check for dept members
            for member in dept_members:
                data = {
                    'student': member.id,
                    'content': '抽查内容',
                    'score': str(score),
                    'checked_at': timezone.now().isoformat(),
                }
                serializer = SpotCheckCreateSerializer(
                    data=data,
                    context={'request': request}
                )
                assert serializer.is_valid(), \
                    f"Dept manager should be able to create spot check for dept member {member.id}. Errors: {serializer.errors}"
            
            # Property assertion 2: Dept manager CANNOT create spot check for other dept members
            for other in other_dept_members:
                data = {
                    'student': other.id,
                    'content': '抽查内容',
                    'score': str(score),
                    'checked_at': timezone.now().isoformat(),
                }
                serializer = SpotCheckCreateSerializer(
                    data=data,
                    context={'request': request}
                )
                assert not serializer.is_valid(), \
                    f"Dept manager should NOT be able to create spot check for other dept member {other.id}"
                assert 'student' in serializer.errors, \
                    "Error should be on 'student' field"
            
        finally:
            # Cleanup
            SpotCheck.objects.filter(checker=dept_manager).delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()


class TestProperty36SpotCheckTimeOrdering:
    """
    **Feature: lms-backend, Property 36: 抽查记录时间排序**
    
    *For any* 抽查记录列表查询，结果应该按 checked_at 降序排列。
    **Validates: Requirements 14.4**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_records=st.integers(min_value=2, max_value=10),
        time_offsets=st.lists(
            st.integers(min_value=1, max_value=100),
            min_size=2,
            max_size=10,
            unique=True
        ),
    )
    def test_spot_checks_ordered_by_checked_at_descending(
        self,
        setup_roles,
        setup_departments,
        num_records,
        time_offsets,
    ):
        """
        **Feature: lms-backend, Property 36: 抽查记录时间排序**
        
        For any spot check list query, results should be ordered
        by checked_at in descending order (newest first).
        
        **Validates: Requirements 14.4**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Ensure we have enough time offsets
        while len(time_offsets) < num_records:
            time_offsets.append(max(time_offsets) + 1)
        time_offsets = time_offsets[:num_records]
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            real_name='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        # Create mentee
        mentee = User.objects.create_user(
            username=f'mentee_{unique_suffix}',
            password='testpass123',
            employee_id=f'MTE_{unique_suffix}',
            real_name='学员',
            department=dept,
            mentor=mentor,
        )
        
        created_users = [mentor, mentee]
        created_spot_checks = []
        
        try:
            now = timezone.now()
            
            # Create spot checks with different checked_at times
            for i, offset in enumerate(time_offsets):
                spot_check = SpotCheck.objects.create(
                    student=mentee,
                    checker=mentor,
                    content=f'抽查内容{i}',
                    score=Decimal('85.00'),
                    comment=f'评语{i}',
                    checked_at=now - timedelta(days=offset),
                )
                created_spot_checks.append(spot_check)
            
            # Query spot checks using model's default ordering
            queryset = SpotCheck.objects.filter(checker=mentor).order_by('-checked_at')
            results = list(queryset)
            
            # Property assertion: Results should be in descending order by checked_at
            for i in range(len(results) - 1):
                current_time = results[i].checked_at
                next_time = results[i + 1].checked_at
                assert current_time >= next_time, \
                    f"Spot checks should be ordered by checked_at descending. " \
                    f"Record {i} ({current_time}) should be >= Record {i+1} ({next_time})"
            
        finally:
            # Cleanup
            for spot_check in created_spot_checks:
                spot_check.delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()

    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        num_records=st.integers(min_value=3, max_value=8),
    )
    def test_spot_checks_model_default_ordering(
        self,
        setup_roles,
        setup_departments,
        num_records,
    ):
        """
        **Feature: lms-backend, Property 36: 抽查记录时间排序**
        
        For any spot check query using model's default ordering,
        results should be ordered by checked_at descending.
        
        **Validates: Requirements 14.4**
        """
        import uuid
        import random
        
        unique_suffix = uuid.uuid4().hex[:8]
        dept = setup_departments['dept1']
        
        # Create mentor
        mentor = User.objects.create_user(
            username=f'mentor_{unique_suffix}',
            password='testpass123',
            employee_id=f'MNT_{unique_suffix}',
            real_name='导师',
            department=dept,
        )
        UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
        
        # Create mentee
        mentee = User.objects.create_user(
            username=f'mentee_{unique_suffix}',
            password='testpass123',
            employee_id=f'MTE_{unique_suffix}',
            real_name='学员',
            department=dept,
            mentor=mentor,
        )
        
        created_users = [mentor, mentee]
        created_spot_checks = []
        
        try:
            now = timezone.now()
            
            # Create spot checks in random order
            offsets = list(range(1, num_records + 1))
            random.shuffle(offsets)
            
            for i, offset in enumerate(offsets):
                spot_check = SpotCheck.objects.create(
                    student=mentee,
                    checker=mentor,
                    content=f'抽查内容{i}',
                    score=Decimal('85.00'),
                    comment=f'评语{i}',
                    checked_at=now - timedelta(days=offset),
                )
                created_spot_checks.append(spot_check)
            
            # Query using model's default ordering (defined in Meta class)
            queryset = SpotCheck.objects.filter(checker=mentor)
            results = list(queryset)
            
            # Property assertion: Results should be in descending order by checked_at
            checked_at_times = [r.checked_at for r in results]
            sorted_times = sorted(checked_at_times, reverse=True)
            
            assert checked_at_times == sorted_times, \
                f"Model default ordering should be by checked_at descending. " \
                f"Got: {checked_at_times}, Expected: {sorted_times}"
            
        finally:
            # Cleanup
            for spot_check in created_spot_checks:
                spot_check.delete()
            for user in created_users:
                User.objects.filter(pk=user.pk).delete()
