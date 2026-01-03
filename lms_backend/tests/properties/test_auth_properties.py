"""
Property-based tests for Authentication.

Tests the following correctness properties:
- Property 1: 有效凭证登录成功
- Property 2: 登录返回完整角色列表
- Property 3: 停用用户登录拒绝
- Property 4: 角色切换权限生效

**Feature: lms-backend**
**Validates: Requirements 1.1, 1.2, 1.3, 1.5, 22.4**
"""
import pytest
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st

from apps.users.models import User, Role, UserRole, Department
from apps.users.services import AuthenticationService
from core.exceptions import BusinessError, ErrorCodes


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
def valid_password_strategy(draw):
    """Generate valid passwords: 8-50 chars."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*',
        min_size=8,
        max_size=50
    ))


@st.composite
def valid_employee_id_strategy(draw):
    """Generate valid employee IDs: alphanumeric, 5-20 chars."""
    return draw(st.text(
        alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        min_size=5,
        max_size=20
    ))


# Non-student roles for testing multi-role scenarios
non_student_roles_strategy = st.lists(
    st.sampled_from(['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER']),
    min_size=0,
    max_size=4,
    unique=True
)


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


# ============ Property Tests ============


class TestProperty1ValidCredentialsLoginSuccess:
    """
    **Feature: lms-backend, Property 1: 有效凭证登录成功**
    
    *For any* 有效的用户凭证（用户名和密码），登录请求应该返回有效的 JWT token 和用户信息。
    **Validates: Requirements 1.1**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        username=valid_username_strategy(),
        password=valid_password_strategy(),
        employee_id=valid_employee_id_strategy(),
    )
    def test_valid_credentials_return_tokens_and_user_info(
        self,
        setup_roles,
        setup_department,
        username,
        password,
        employee_id,
    ):
        """
        **Feature: lms-backend, Property 1: 有效凭证登录成功**
        
        For any valid user credentials (username and password), the login
        request should return valid JWT tokens and user information.
        
        **Validates: Requirements 1.1**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        unique_username = f"{username}_{unique_suffix}"
        unique_employee_id = f"{employee_id}_{unique_suffix}"
        
        # Ensure unique username and employee_id
        assume(not User.objects.filter(username=unique_username).exists())
        assume(not User.objects.filter(employee_id=unique_employee_id).exists())
        
        # Create user with valid credentials
        user = User.objects.create_user(
            username=unique_username,
            password=password,
            employee_id=unique_employee_id,
            department=setup_department,
        )
        
        try:
            # Attempt login with valid credentials (use employee_id, not username)
            auth_service = AuthenticationService()
            result = auth_service.login(unique_employee_id, password)
            
            # Property assertions: login should return valid tokens and user info
            assert 'access_token' in result, "Login should return access_token"
            assert 'refresh_token' in result, "Login should return refresh_token"
            assert result['access_token'] is not None, "access_token should not be None"
            assert result['refresh_token'] is not None, "refresh_token should not be None"
            assert len(result['access_token']) > 0, "access_token should not be empty"
            assert len(result['refresh_token']) > 0, "refresh_token should not be empty"
            
            # User info assertions
            assert 'user' in result, "Login should return user info"
            assert result['user']['id'] == user.id, "User ID should match"
            assert result['user']['username'] == unique_username, "Username should match"
            assert result['user']['employee_id'] == unique_employee_id, "Employee ID should match"
            
        finally:
            # Cleanup
            user.delete()


class TestProperty2LoginReturnsCompleteRoleList:
    """
    **Feature: lms-backend, Property 2: 登录返回完整角色列表**
    
    *For any* 拥有多角色的用户，登录响应中的 available_roles 应该包含该用户的所有已分配角色。
    **Validates: Requirements 1.2**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(additional_roles=non_student_roles_strategy)
    def test_login_returns_all_assigned_roles(
        self,
        setup_roles,
        setup_department,
        additional_roles,
    ):
        """
        **Feature: lms-backend, Property 2: 登录返回完整角色列表**
        
        For any user with multiple roles, the login response's available_roles
        should contain all assigned roles for that user.
        
        **Validates: Requirements 1.2**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create user
        user = User.objects.create_user(
            username=f'user_{unique_suffix}',
            password='testpass123',
            employee_id=f'EMP_{unique_suffix}',
            department=setup_department,
        )
        
        try:
            # Assign additional roles
            for role_code in additional_roles:
                role = setup_roles[role_code]
                UserRole.objects.get_or_create(user=user, role=role)
            
            # Expected roles: STUDENT (default) + additional roles
            expected_role_codes = set(['STUDENT'] + additional_roles)
            
            # Login (use employee_id, not username)
            auth_service = AuthenticationService()
            result = auth_service.login(f'EMP_{unique_suffix}', 'testpass123')
            
            # Property assertion: available_roles should contain all assigned roles
            returned_role_codes = set(r['code'] for r in result['available_roles'])
            
            assert returned_role_codes == expected_role_codes, \
                f"Expected roles {expected_role_codes}, got {returned_role_codes}"
            
            # Verify each role has both code and name
            for role_info in result['available_roles']:
                assert 'code' in role_info, "Each role should have a code"
                assert 'name' in role_info, "Each role should have a name"
                
        finally:
            # Cleanup
            user.delete()


class TestProperty3InactiveUserLoginRejected:
    """
    **Feature: lms-backend, Property 3: 停用用户登录拒绝**
    
    *For any* is_active=False 的用户，登录请求应该返回 401 错误。
    **Validates: Requirements 1.5**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        username=valid_username_strategy(),
        password=valid_password_strategy(),
        employee_id=valid_employee_id_strategy(),
    )
    def test_inactive_user_login_rejected(
        self,
        setup_roles,
        setup_department,
        username,
        password,
        employee_id,
    ):
        """
        **Feature: lms-backend, Property 3: 停用用户登录拒绝**
        
        For any user with is_active=False, the login request should be
        rejected with AUTH_USER_INACTIVE error.
        
        **Validates: Requirements 1.5**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        unique_username = f"{username}_{unique_suffix}"
        unique_employee_id = f"{employee_id}_{unique_suffix}"
        
        # Ensure unique username and employee_id
        assume(not User.objects.filter(username=unique_username).exists())
        assume(not User.objects.filter(employee_id=unique_employee_id).exists())
        
        # Create inactive user
        user = User.objects.create_user(
            username=unique_username,
            password=password,
            employee_id=unique_employee_id,
            department=setup_department,
            is_active=False,
        )
        
        try:
            # Property assertion: login should be rejected for inactive user (use employee_id, not username)
            auth_service = AuthenticationService()
            with pytest.raises(BusinessError) as exc_info:
                auth_service.login(unique_employee_id, password)
            
            assert exc_info.value.code == ErrorCodes.AUTH_USER_INACTIVE, \
                f"Expected AUTH_USER_INACTIVE error, got {exc_info.value.code}"
            
        finally:
            # Cleanup
            user.delete()


class TestProperty4RoleSwitchPermissionEffective:
    """
    **Feature: lms-backend, Property 4: 角色切换权限生效**
    
    *For any* 用户切换角色后，后续 API 请求的权限验证应该基于新角色进行。
    **Validates: Requirements 1.3, 22.4**
    """
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        target_role=st.sampled_from(['STUDENT', 'MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER'])
    )
    def test_role_switch_updates_current_role(
        self,
        setup_roles,
        setup_department,
        target_role,
    ):
        """
        **Feature: lms-backend, Property 4: 角色切换权限生效**
        
        For any user with multiple roles, switching to a valid role should
        update the current_role in the response and generate new tokens.
        
        **Validates: Requirements 1.3, 22.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Create user with all roles
        user = User.objects.create_user(
            username=f'multi_role_{unique_suffix}',
            password='testpass123',
            employee_id=f'MR_{unique_suffix}',
            department=setup_department,
        )
        
        try:
            # Assign all roles to user
            for role_code in ['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER']:
                role = setup_roles[role_code]
                UserRole.objects.get_or_create(user=user, role=role)
            
            # Switch to target role
            auth_service = AuthenticationService()
            result = auth_service.switch_role(user, target_role)
            
            # Property assertions
            assert result['current_role'] == target_role, \
                f"Expected current_role to be {target_role}, got {result['current_role']}"
            
            assert 'access_token' in result, "Role switch should return new access_token"
            assert 'refresh_token' in result, "Role switch should return new refresh_token"
            assert result['access_token'] is not None, "access_token should not be None"
            assert result['refresh_token'] is not None, "refresh_token should not be None"
            
            # Verify user info is still correct
            assert result['user']['id'] == user.id, "User ID should remain the same"
            
        finally:
            # Cleanup
            user.delete()
    
    @pytest.mark.django_db(transaction=True)
    @settings(**HYPOTHESIS_SETTINGS)
    @given(
        assigned_roles=st.lists(
            st.sampled_from(['MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER']),
            min_size=1,
            max_size=3,
            unique=True
        ),
        data=st.data()
    )
    def test_role_switch_to_unassigned_role_fails(
        self,
        setup_roles,
        setup_department,
        assigned_roles,
        data,
    ):
        """
        **Feature: lms-backend, Property 4: 角色切换权限生效**
        
        For any user, switching to a role they don't have should fail
        with AUTH_INVALID_ROLE error.
        
        **Validates: Requirements 1.3, 22.4**
        """
        import uuid
        unique_suffix = uuid.uuid4().hex[:8]
        
        # Determine unassigned roles
        all_non_student_roles = {'MENTOR', 'DEPT_MANAGER', 'ADMIN', 'TEAM_MANAGER'}
        assigned_set = set(assigned_roles)
        unassigned_roles = list(all_non_student_roles - assigned_set)
        
        # Skip if all roles are assigned
        assume(len(unassigned_roles) > 0)
        
        # Pick an unassigned role to try switching to
        target_role = data.draw(st.sampled_from(unassigned_roles))
        
        # Create user
        user = User.objects.create_user(
            username=f'partial_role_{unique_suffix}',
            password='testpass123',
            employee_id=f'PR_{unique_suffix}',
            department=setup_department,
        )
        
        try:
            # Assign only some roles
            for role_code in assigned_roles:
                role = setup_roles[role_code]
                UserRole.objects.get_or_create(user=user, role=role)
            
            # Property assertion: switching to unassigned role should fail
            auth_service = AuthenticationService()
            with pytest.raises(BusinessError) as exc_info:
                auth_service.switch_role(user, target_role)
            
            assert exc_info.value.code == ErrorCodes.AUTH_INVALID_ROLE, \
                f"Expected AUTH_INVALID_ROLE error, got {exc_info.value.code}"
            
        finally:
            # Cleanup
            user.delete()
