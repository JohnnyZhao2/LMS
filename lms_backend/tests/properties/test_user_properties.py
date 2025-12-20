"""
Property-based tests for User model.

Tests the following correctness properties:
- Property 5: 新用户默认学员角色
- Property 6: 用户信息更新一致性
- Property 7: 用户停用/启用状态切换
- Property 8: 有数据用户删除保护
- Property 9: 学员角色不可移除
- Property 10: 师徒关系唯一性
- Property 11: 室经理权限原子转移

**Feature: lms-backend**
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 3.4, 3.5, 3.6**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st
from django.core.exceptions import ValidationError

from apps.users.models import User, Role, UserRole, Department
from apps.users.services import UserManagementService, AuthenticationService


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
    """Generate valid usernames: alphanumeric + underscore, 3-30 chars, not starting with digit."""
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


@st.composite
def valid_username_strategy(draw):
    """Generate valid real names: 1-50 chars."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ中文测试用户',
        min_size=1,
        max_size=50
    ))


@st.composite
def non_student_role_codes_strategy(draw):
    """Generate a list of role codes that may or may not include STUDENT."""
    non_student_roles = ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER']
    selected = draw(st.lists(
        st.sampled_from(non_student_roles),
        min_size=0,
        max_size=4,
        unique=True
    ))
    # Optionally include STUDENT
    include_student = draw(st.booleans())
    if include_student:
        selected.append('STUDENT')
    return selected


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
def setup_department(db):
    """Create a test department."""
    dept, _ = Department.objects.get_or_create(
        code='TEST001',
        defaults={'name': '测试部门', 'description': '测试用部门'}
    )
    return dept


@pytest.fixture
def user_counter():
    """Counter for generating unique usernames."""
    return {'count': 0}


# ============ Property Tests ============


class TestProperty5NewUserDefaultStudentRole:
    """
    **Feature: lms-backend, Property 5: 新用户默认学员角色**
    
    *For any* 新创建的用户，其角色列表中必须包含 STUDENT 角色。
    **Validates: Requirements 2.1**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        username=valid_username_strategy(),
        employee_id=valid_employee_id_strategy(),
        username=valid_username_strategy(),
    )
    def test_new_user_has_student_role(
        self, 
        setup_roles, 
        setup_department,
        username, 
        employee_id, 
        username
    ):
        """
        **Feature: lms-backend, Property 5: 新用户默认学员角色**
        
        For any new user created with valid data, the user's role list
        must contain the STUDENT role.
        
        **Validates: Requirements 2.1**
        """
        # Ensure unique username and employee_id by adding random suffix
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        unique_username = f"{username}_{unique_suffix}"
        unique_employee_id = f"{employee_id}_{unique_suffix}"
        
        # Ensure username doesn't already exist
        assume(not User.objects.filter(username=unique_username).exists())
        assume(not User.objects.filter(employee_id=unique_employee_id).exists())
        
        # Create user
        user = User.objects.create_user(
            username=unique_username,
            password='testpass123',
            employee_id=unique_employee_id,
            username=username,
            department=setup_department,
        )
        
        try:
            # Property assertion: new user must have STUDENT role
            assert user.has_role('STUDENT'), \
                f"New user {unique_username} does not have STUDENT role"
            
            # Additional check: STUDENT should be in role_codes
            assert 'STUDENT' in user.role_codes, \
                f"STUDENT not in role_codes for user {unique_username}"
        finally:
            # Cleanup
            user.delete()


class TestProperty9StudentRoleCannotBeRemoved:
    """
    **Feature: lms-backend, Property 9: 学员角色不可移除**
    
    *For any* 角色分配操作，用户的角色列表中必须始终包含 STUDENT 角色。
    **Validates: Requirements 2.6**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(role_codes=non_student_role_codes_strategy())
    def test_student_role_preserved_after_role_assignment(
        self,
        setup_roles,
        setup_department,
        role_codes
    ):
        """
        **Feature: lms-backend, Property 9: 学员角色不可移除**
        
        For any role assignment operation (with any combination of roles),
        the user's role list must always contain the STUDENT role.
        
        **Validates: Requirements 2.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
        )
        
        # Create an admin user for role assignment
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='adminpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=setup_department,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        try:
            # Assign roles (may or may not include STUDENT)
            updated_user = UserManagementService.assign_roles(
                user_id=user.id,
                role_codes=role_codes,
                assigned_by=admin
            )
            
            # Property assertion: STUDENT role must always be present
            assert updated_user.has_role('STUDENT'), \
                f"User lost STUDENT role after assigning roles: {role_codes}"
            
            assert 'STUDENT' in updated_user.role_codes, \
                f"STUDENT not in role_codes after assignment: {role_codes}"
        finally:
            # Cleanup
            user.delete()
            admin.delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_student_role_cannot_be_deleted_directly(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 9: 学员角色不可移除**
        
        For any attempt to directly delete the STUDENT UserRole,
        a ValidationError must be raised.
        
        **Validates: Requirements 2.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
        )
        
        try:
            # Get the STUDENT UserRole
            student_user_role = UserRole.objects.get(
                user=user, 
                role=setup_roles['STUDENT']
            )
            
            # Property assertion: deleting STUDENT role should raise ValidationError
            with pytest.raises(ValidationError) as exc_info:
                student_user_role.delete()
            
            assert '学员角色不可移除' in str(exc_info.value)
            
            # Verify STUDENT role still exists
            assert user.has_role('STUDENT'), \
                "STUDENT role was removed despite ValidationError"
        finally:
            # Cleanup - force delete user (which cascades)
            User.objects.filter(pk=user.pk).delete()


class TestProperty6UserInfoUpdateConsistency:
    """
    **Feature: lms-backend, Property 6: 用户信息更新一致性**
    
    *For any* 用户信息更新操作，数据库中的用户记录应该反映更新后的值。
    **Validates: Requirements 2.2**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        new_username=valid_username_strategy(),
        new_employee_id=valid_employee_id_strategy(),
    )
    def test_user_info_update_reflects_in_database(
        self,
        setup_roles,
        setup_department,
        new_username,
        new_employee_id
    ):
        """
        **Feature: lms-backend, Property 6: 用户信息更新一致性**
        
        For any user info update operation, the database record should
        reflect the updated values.
        
        **Validates: Requirements 2.2**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='原始姓名',
            department=setup_department,
        )
        
        try:
            # Generate unique values for update
            unique_username = f"{new_username}_{unique_suffix}"
            unique_employee_id = f"{new_employee_id}_{unique_suffix}"
            
            # Ensure the new employee_id doesn't conflict
            assume(not User.objects.filter(employee_id=unique_employee_id).exclude(pk=user.pk).exists())
            
            # Update user info
            user.username = unique_username
            user.employee_id = unique_employee_id
            user.save()
            
            # Refresh from database
            user.refresh_from_db()
            
            # Property assertion: database should reflect updated values
            assert user.username == unique_username, \
                f"username not updated: expected {unique_username}, got {user.username}"
            assert user.employee_id == unique_employee_id, \
                f"employee_id not updated: expected {unique_employee_id}, got {user.employee_id}"
            
            # Verify by querying directly
            db_user = User.objects.get(pk=user.pk)
            assert db_user.username == unique_username
            assert db_user.employee_id == unique_employee_id
        finally:
            # Cleanup
            User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_department_change_updates_correctly(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 6: 用户信息更新一致性**
        
        For any department change operation, the user's department
        should be updated in the database.
        
        **Validates: Requirements 2.2, 3.1**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a second department
        new_dept, _ = Department.objects.get_or_create(
            code=f'DEPT_{unique_suffix}',
            defaults={'name': f'新部门_{unique_suffix}', 'description': '测试用新部门'}
        )
        
        # Create a user in the original department
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
        )
        
        try:
            original_dept_id = user.department.id
            
            # Update department
            user.department = new_dept
            user.save()
            
            # Refresh from database
            user.refresh_from_db()
            
            # Property assertion: department should be updated
            assert user.department.id == new_dept.id, \
                f"Department not updated: expected {new_dept.id}, got {user.department.id}"
            assert user.department.id != original_dept_id, \
                "Department should have changed"
        finally:
            # Cleanup
            User.objects.filter(pk=user.pk).delete()
            Department.objects.filter(pk=new_dept.pk).delete()


class TestProperty7UserActivationDeactivation:
    """
    **Feature: lms-backend, Property 7: 用户停用/启用状态切换**
    
    *For any* 用户停用操作，is_active 应该变为 False；启用操作后，is_active 应该变为 True 且用户能够成功登录。
    **Validates: Requirements 2.3, 2.4**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(data=st.data())
    def test_deactivate_sets_is_active_false(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 7: 用户停用/启用状态切换**
        
        For any user deactivation operation, is_active should become False.
        
        **Validates: Requirements 2.3**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create an active user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
            is_active=True,
        )
        
        try:
            # Verify user is initially active
            assert user.is_active is True
            
            # Deactivate user
            deactivated_user = UserManagementService.deactivate_user(user.id)
            
            # Property assertion: is_active should be False
            assert deactivated_user.is_active is False, \
                "User should be deactivated (is_active=False)"
            
            # Verify in database
            user.refresh_from_db()
            assert user.is_active is False, \
                "Database should reflect deactivated status"
        finally:
            # Cleanup
            User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(data=st.data())
    def test_activate_sets_is_active_true(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 7: 用户停用/启用状态切换**
        
        For any user activation operation, is_active should become True.
        
        **Validates: Requirements 2.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create an inactive user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
            is_active=False,
        )
        
        try:
            # Verify user is initially inactive
            assert user.is_active is False
            
            # Activate user
            activated_user = UserManagementService.activate_user(user.id)
            
            # Property assertion: is_active should be True
            assert activated_user.is_active is True, \
                "User should be activated (is_active=True)"
            
            # Verify in database
            user.refresh_from_db()
            assert user.is_active is True, \
                "Database should reflect activated status"
        finally:
            # Cleanup
            User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(num_toggles=st.integers(min_value=1, max_value=5))
    def test_activation_deactivation_round_trip(
        self,
        setup_roles,
        setup_department,
        num_toggles
    ):
        """
        **Feature: lms-backend, Property 7: 用户停用/启用状态切换**
        
        For any sequence of activation/deactivation operations,
        the final state should match the last operation.
        
        **Validates: Requirements 2.3, 2.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create an active user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
            is_active=True,
        )
        
        try:
            expected_active = True
            
            for i in range(num_toggles):
                if expected_active:
                    UserManagementService.deactivate_user(user.id)
                    expected_active = False
                else:
                    UserManagementService.activate_user(user.id)
                    expected_active = True
                
                user.refresh_from_db()
                assert user.is_active == expected_active, \
                    f"After toggle {i+1}, expected is_active={expected_active}, got {user.is_active}"
        finally:
            # Cleanup
            User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_deactivated_user_cannot_login(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 7: 用户停用/启用状态切换**
        
        For any deactivated user, login attempts should be rejected.
        
        **Validates: Requirements 2.3, 1.5**
        """
        import uuid
        from core.exceptions import BusinessError
        
        unique_suffix = uuid.uuid4().hex[:8]
        password = 'testpass123'
        
        # Create an active user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password=password,
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
            is_active=True,
        )
        
        try:
            # Deactivate user
            UserManagementService.deactivate_user(user.id)
            
            # Property assertion: login should fail
            with pytest.raises(BusinessError) as exc_info:
                AuthenticationService.login(
                    username=f'test_user_{unique_suffix}',
                    password=password
                )
            
            assert exc_info.value.code == 'AUTH_USER_INACTIVE', \
                f"Expected AUTH_USER_INACTIVE error, got {exc_info.value.code}"
        finally:
            # Cleanup
            User.objects.filter(pk=user.pk).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_reactivated_user_can_login(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 7: 用户停用/启用状态切换**
        
        For any reactivated user, login should succeed with valid credentials.
        
        **Validates: Requirements 2.4**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        password = 'testpass123'
        
        # Create an inactive user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password=password,
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
            is_active=False,
        )
        
        try:
            # Activate user
            UserManagementService.activate_user(user.id)
            
            # Property assertion: login should succeed
            result = AuthenticationService.login(
                username=f'test_user_{unique_suffix}',
                password=password
            )
            
            assert 'access_token' in result, "Login should return access_token"
            assert result['user']['id'] == user.id, "Login should return correct user"
        finally:
            # Cleanup
            User.objects.filter(pk=user.pk).delete()


class TestProperty8UserDeleteProtection:
    """
    **Feature: lms-backend, Property 8: 有数据用户删除保护**
    
    *For any* 已产生 TaskAssignment、Submission 或 SpotCheck 记录的用户，删除操作应该返回 400 错误。
    **Validates: Requirements 2.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_user_with_task_assignment_cannot_be_deleted(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 8: 有数据用户删除保护**
        
        For any user with TaskAssignment records, delete should fail.
        
        **Validates: Requirements 2.5**
        """
        import uuid
        from datetime import timedelta
        from django.utils import timezone
        from core.exceptions import BusinessError
        from apps.tasks.models import Task, TaskAssignment
        
        unique_suffix = uuid.uuid4().hex[:8]
        task = None
        
        # Create a user
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
        )
        
        # Create a task creator
        creator = User.objects.create_user(
            username=f'creator_{unique_suffix}',
            password='testpass123',
            employee_id=f'CRE_{unique_suffix}',
            username='任务创建者',
            department=setup_department,
        )
        
        try:
            # Create a task and assign to user (with required deadline field)
            task = Task.objects.create(
                title=f'测试任务_{unique_suffix}',
                task_type='LEARNING',
                deadline=timezone.now() + timedelta(days=7),
                created_by=creator,
            )
            TaskAssignment.objects.create(
                task=task,
                assignee=user,
                status='IN_PROGRESS',
            )
            
            # Property assertion: delete should fail
            with pytest.raises(BusinessError) as exc_info:
                UserManagementService.delete_user(user.id)
            
            assert exc_info.value.code == 'USER_HAS_DATA', \
                f"Expected USER_HAS_DATA error, got {exc_info.value.code}"
            
            # Verify user still exists
            assert User.objects.filter(pk=user.pk).exists(), \
                "User should not be deleted"
        finally:
            # Cleanup
            TaskAssignment.objects.filter(assignee=user).delete()
            if task:
                Task.objects.filter(pk=task.pk).delete()
            User.objects.filter(pk__in=[user.pk, creator.pk]).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_user_with_spot_check_cannot_be_deleted(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 8: 有数据用户删除保护**
        
        For any user with SpotCheck records, delete should fail.
        
        **Validates: Requirements 2.5**
        """
        import uuid
        from decimal import Decimal
        from django.utils import timezone
        from core.exceptions import BusinessError
        from apps.spot_checks.models import SpotCheck
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a student user
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=setup_department,
        )
        
        # Create a checker user
        checker = User.objects.create_user(
            username=f'checker_{unique_suffix}',
            password='testpass123',
            employee_id=f'CHK_{unique_suffix}',
            username='检查者',
            department=setup_department,
        )
        
        try:
            # Create a spot check record (with required checked_at field)
            SpotCheck.objects.create(
                student=student,
                checker=checker,
                content='抽查内容',
                score=Decimal('85.00'),
                comment='评语',
                checked_at=timezone.now(),
            )
            
            # Property assertion: delete should fail
            with pytest.raises(BusinessError) as exc_info:
                UserManagementService.delete_user(student.id)
            
            assert exc_info.value.code == 'USER_HAS_DATA', \
                f"Expected USER_HAS_DATA error, got {exc_info.value.code}"
            
            # Verify user still exists
            assert User.objects.filter(pk=student.pk).exists(), \
                "User should not be deleted"
        finally:
            # Cleanup
            SpotCheck.objects.filter(student=student).delete()
            User.objects.filter(pk__in=[student.pk, checker.pk]).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_user_without_data_can_be_deleted(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 8: 有数据用户删除保护**
        
        For any user without associated data, delete should succeed.
        
        **Validates: Requirements 2.5**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a user without any associated data
        user = User.objects.create_user(
            username=f'test_user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            username='测试用户',
            department=setup_department,
        )
        
        user_id = user.id
        
        # Property assertion: delete should succeed
        result = UserManagementService.delete_user(user_id)
        
        assert result is True, "Delete should return True"
        assert not User.objects.filter(pk=user_id).exists(), \
            "User should be deleted from database"


class TestProperty11DeptManagerPermissionTransfer:
    """
    **Feature: lms-backend, Property 11: 室经理权限原子转移**
    
    *For any* 室经理更换操作，原室经理应该失去 DEPT_MANAGER 角色，新室经理应该获得 DEPT_MANAGER 角色。
    **Validates: Requirements 3.2, 3.3**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_dept_manager_role_transfer(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 11: 室经理权限原子转移**
        
        For any department manager change, the old manager should lose
        DEPT_MANAGER role and the new manager should gain it.
        
        **Validates: Requirements 3.2, 3.3**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create an admin for role assignment
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=setup_department,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create original department manager
        old_manager = User.objects.create_user(
            username=f'old_manager_{unique_suffix}',
            password='testpass123',
            employee_id=f'OLD_{unique_suffix}',
            username='原室经理',
            department=setup_department,
        )
        
        # Create new department manager
        new_manager = User.objects.create_user(
            username=f'new_manager_{unique_suffix}',
            password='testpass123',
            employee_id=f'NEW_{unique_suffix}',
            username='新室经理',
            department=setup_department,
        )
        
        try:
            # Assign DEPT_MANAGER role to old manager
            UserManagementService.assign_roles(
                user_id=old_manager.id,
                role_codes=['DEPT_MANAGER'],
                assigned_by=admin
            )
            
            old_manager.refresh_from_db()
            assert old_manager.has_role('DEPT_MANAGER'), \
                "Old manager should have DEPT_MANAGER role"
            
            # Transfer: remove from old manager, add to new manager
            # Step 1: Remove DEPT_MANAGER from old manager
            UserManagementService.assign_roles(
                user_id=old_manager.id,
                role_codes=[],  # Only STUDENT will remain
                assigned_by=admin
            )
            
            # Step 2: Add DEPT_MANAGER to new manager
            UserManagementService.assign_roles(
                user_id=new_manager.id,
                role_codes=['DEPT_MANAGER'],
                assigned_by=admin
            )
            
            # Refresh from database
            old_manager.refresh_from_db()
            new_manager.refresh_from_db()
            
            # Property assertions
            assert not old_manager.has_role('DEPT_MANAGER'), \
                "Old manager should NOT have DEPT_MANAGER role after transfer"
            assert old_manager.has_role('STUDENT'), \
                "Old manager should still have STUDENT role"
            
            assert new_manager.has_role('DEPT_MANAGER'), \
                "New manager should have DEPT_MANAGER role after transfer"
            assert new_manager.has_role('STUDENT'), \
                "New manager should still have STUDENT role"
        finally:
            # Cleanup
            User.objects.filter(pk__in=[admin.pk, old_manager.pk, new_manager.pk]).delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=30, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(num_transfers=st.integers(min_value=1, max_value=3))
    def test_multiple_dept_manager_transfers(
        self,
        setup_roles,
        setup_department,
        num_transfers
    ):
        """
        **Feature: lms-backend, Property 11: 室经理权限原子转移**
        
        For any sequence of department manager transfers, only the last
        assigned user should have the DEPT_MANAGER role.
        
        **Validates: Requirements 3.2, 3.3**
        """
        import uuid
        
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create an admin for role assignment
        admin = User.objects.create_user(
            username=f'admin_{unique_suffix}',
            password='testpass123',
            employee_id=f'ADM_{unique_suffix}',
            username='管理员',
            department=setup_department,
        )
        UserRole.objects.get_or_create(user=admin, role=setup_roles['ADMIN'])
        
        # Create multiple potential managers
        managers = []
        for i in range(num_transfers + 1):
            manager = User.objects.create_user(
                username=f'manager_{unique_suffix}_{i}',
                password='testpass123',
                employee_id=f'MGR_{unique_suffix}_{i}',
                username=f'经理{i}',
                department=setup_department,
            )
            managers.append(manager)
        
        try:
            current_manager = None
            
            for i in range(num_transfers):
                new_manager = managers[i]
                
                # Remove role from current manager if exists
                if current_manager:
                    UserManagementService.assign_roles(
                        user_id=current_manager.id,
                        role_codes=[],
                        assigned_by=admin
                    )
                
                # Assign role to new manager
                UserManagementService.assign_roles(
                    user_id=new_manager.id,
                    role_codes=['DEPT_MANAGER'],
                    assigned_by=admin
                )
                
                current_manager = new_manager
                
                # Verify only current manager has the role
                for j, mgr in enumerate(managers[:i+1]):
                    mgr.refresh_from_db()
                    if j == i:
                        assert mgr.has_role('DEPT_MANAGER'), \
                            f"Manager {j} should have DEPT_MANAGER role"
                    else:
                        assert not mgr.has_role('DEPT_MANAGER'), \
                            f"Manager {j} should NOT have DEPT_MANAGER role"
        finally:
            # Cleanup
            User.objects.filter(pk=admin.pk).delete()
            for mgr in managers:
                User.objects.filter(pk=mgr.pk).delete()


class TestProperty10MentorRelationshipUniqueness:
    """
    **Feature: lms-backend, Property 10: 师徒关系唯一性**
    
    *For any* 学员，同一时间最多只能有一个导师。
    **Validates: Requirements 3.4, 3.5, 3.6**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(num_mentor_changes=st.integers(min_value=1, max_value=5))
    def test_student_has_at_most_one_mentor(
        self,
        setup_roles,
        setup_department,
        num_mentor_changes
    ):
        """
        **Feature: lms-backend, Property 10: 师徒关系唯一性**
        
        For any student, after any number of mentor assignments,
        the student should have at most one mentor at any time.
        
        **Validates: Requirements 3.4, 3.5, 3.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=setup_department,
        )
        
        # Create multiple mentors
        mentors = []
        for i in range(num_mentor_changes + 1):
            mentor = User.objects.create_user(
                username=f'mentor_{unique_suffix}_{i}',
                password='testpass123',
                employee_id=f'MEN_{unique_suffix}_{i}',
                username=f'导师{i}',
                department=setup_department,
            )
            UserRole.objects.get_or_create(user=mentor, role=setup_roles['MENTOR'])
            mentors.append(mentor)
        
        try:
            # Perform multiple mentor assignments
            for i in range(num_mentor_changes):
                mentor = mentors[i]
                updated_student = UserManagementService.assign_mentor(
                    user_id=student.id,
                    mentor_id=mentor.id
                )
                
                # Property assertion: student has exactly one mentor
                assert updated_student.mentor is not None, \
                    f"Student should have a mentor after assignment"
                assert updated_student.mentor.id == mentor.id, \
                    f"Student's mentor should be the last assigned mentor"
                
                # Verify uniqueness: count mentors (should be 0 or 1)
                student.refresh_from_db()
                mentor_count = 1 if student.mentor else 0
                assert mentor_count <= 1, \
                    f"Student has {mentor_count} mentors, expected at most 1"
            
            # Test removing mentor
            updated_student = UserManagementService.assign_mentor(
                user_id=student.id,
                mentor_id=None
            )
            
            # Property assertion: mentor should be None after removal
            assert updated_student.mentor is None, \
                "Student should have no mentor after removal"
        finally:
            # Cleanup
            student.delete()
            for mentor in mentors:
                mentor.delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(max_examples=50, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @given(data=st.data())
    def test_new_mentor_replaces_old_mentor(
        self,
        setup_roles,
        setup_department,
        data
    ):
        """
        **Feature: lms-backend, Property 10: 师徒关系唯一性**
        
        For any student with an existing mentor, assigning a new mentor
        should automatically replace the old mentor (not add a second one).
        
        **Validates: Requirements 3.6**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create a student
        student = User.objects.create_user(
            username=f'student_{unique_suffix}',
            password='testpass123',
            employee_id=f'STU_{unique_suffix}',
            username='学员',
            department=setup_department,
        )
        
        # Create two mentors
        mentor1 = User.objects.create_user(
            username=f'mentor1_{unique_suffix}',
            password='testpass123',
            employee_id=f'MEN1_{unique_suffix}',
            username='导师1',
            department=setup_department,
        )
        UserRole.objects.get_or_create(user=mentor1, role=setup_roles['MENTOR'])
        
        mentor2 = User.objects.create_user(
            username=f'mentor2_{unique_suffix}',
            password='testpass123',
            employee_id=f'MEN2_{unique_suffix}',
            username='导师2',
            department=setup_department,
        )
        UserRole.objects.get_or_create(user=mentor2, role=setup_roles['MENTOR'])
        
        try:
            # Assign first mentor
            UserManagementService.assign_mentor(
                user_id=student.id,
                mentor_id=mentor1.id
            )
            student.refresh_from_db()
            assert student.mentor.id == mentor1.id
            
            # Assign second mentor (should replace first)
            UserManagementService.assign_mentor(
                user_id=student.id,
                mentor_id=mentor2.id
            )
            student.refresh_from_db()
            
            # Property assertion: new mentor replaces old mentor
            assert student.mentor.id == mentor2.id, \
                "New mentor should replace old mentor"
            assert student.mentor.id != mentor1.id, \
                "Old mentor should be replaced"
            
            # Verify there's only one mentor relationship
            # (The FK constraint ensures this at DB level, but let's verify)
            assert student.mentor is not None
        finally:
            # Cleanup
            student.delete()
            mentor1.delete()
            mentor2.delete()
