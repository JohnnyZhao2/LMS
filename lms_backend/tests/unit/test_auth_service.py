"""
Unit tests for authentication service.

Tests the core authentication functionality:
- Login with valid credentials
- Login rejection for inactive users
- Role switching
- Token generation

Requirements: 1.1, 1.2, 1.3, 1.5
"""
import pytest
from django.contrib.auth import get_user_model

from apps.users.services import AuthenticationService
from apps.users.models import Role, UserRole
from core.exceptions import BusinessError, ErrorCodes

User = get_user_model()


class TestAuthenticationServiceLogin:
    """Tests for login functionality."""
    
    def test_login_with_valid_credentials(self, create_user):
        """
        Test that login succeeds with valid credentials.
        
        Requirements: 1.1
        """
        user = create_user(username='testuser', password='testpass123')
        
        result = AuthenticationService.login('testuser', 'testpass123')
        
        assert 'access_token' in result
        assert 'refresh_token' in result
        assert result['user']['id'] == user.id
        assert result['user']['username'] == 'testuser'
    
    def test_login_returns_all_roles(self, create_user, mentor_role):
        """
        Test that login returns all available roles.
        
        Requirements: 1.2
        """
        user = create_user(username='mentor_user', password='testpass123')
        # Add mentor role
        UserRole.objects.create(user=user, role=mentor_role)
        
        result = AuthenticationService.login('mentor_user', 'testpass123')
        
        role_codes = [r['code'] for r in result['available_roles']]
        assert 'STUDENT' in role_codes
        assert 'MENTOR' in role_codes
        assert len(result['available_roles']) == 2
    
    def test_login_rejects_invalid_credentials(self, create_user):
        """
        Test that login fails with invalid credentials.
        
        Requirements: 1.1
        """
        create_user(username='testuser', password='testpass123')
        
        with pytest.raises(BusinessError) as exc_info:
            AuthenticationService.login('testuser', 'wrongpassword')
        
        assert exc_info.value.code == ErrorCodes.AUTH_INVALID_CREDENTIALS
    
    def test_login_rejects_inactive_user(self, create_user):
        """
        Test that login fails for inactive users.
        
        Requirements: 1.5
        Property 3: 停用用户登录拒绝
        """
        create_user(username='inactive_user', password='testpass123', is_active=False)
        
        with pytest.raises(BusinessError) as exc_info:
            AuthenticationService.login('inactive_user', 'testpass123')
        
        assert exc_info.value.code == ErrorCodes.AUTH_USER_INACTIVE
    
    def test_login_rejects_nonexistent_user(self, db):
        """Test that login fails for non-existent users."""
        with pytest.raises(BusinessError) as exc_info:
            AuthenticationService.login('nonexistent', 'password')
        
        assert exc_info.value.code == ErrorCodes.AUTH_INVALID_CREDENTIALS


class TestAuthenticationServiceRoleSwitch:
    """Tests for role switching functionality."""
    
    def test_switch_to_valid_role(self, create_user, mentor_role):
        """
        Test that role switching works for valid roles.
        
        Requirements: 1.3
        Property 4: 角色切换权限生效
        """
        user = create_user(username='multi_role_user', password='testpass123')
        UserRole.objects.create(user=user, role=mentor_role)
        
        result = AuthenticationService.switch_role(user, 'MENTOR')
        
        assert result['current_role'] == 'MENTOR'
        assert 'access_token' in result
        assert 'refresh_token' in result
    
    def test_switch_to_invalid_role_fails(self, create_user):
        """
        Test that switching to a role the user doesn't have fails.
        
        Requirements: 1.3
        """
        user = create_user(username='student_only', password='testpass123')
        
        with pytest.raises(BusinessError) as exc_info:
            AuthenticationService.switch_role(user, 'ADMIN')
        
        assert exc_info.value.code == ErrorCodes.AUTH_INVALID_ROLE


class TestAuthenticationServiceLogout:
    """Tests for logout functionality."""
    
    def test_logout_succeeds(self, create_user):
        """Test that logout succeeds."""
        user = create_user(username='logout_user', password='testpass123')
        
        # First login to get tokens
        login_result = AuthenticationService.login('logout_user', 'testpass123')
        
        # Then logout
        result = AuthenticationService.logout(user, login_result['refresh_token'])
        
        assert result is True


class TestAuthenticationServiceTokenRefresh:
    """Tests for token refresh functionality."""
    
    def test_refresh_token_succeeds(self, create_user):
        """Test that token refresh works with valid refresh token."""
        user = create_user(username='refresh_user', password='testpass123')
        
        # First login to get tokens
        login_result = AuthenticationService.login('refresh_user', 'testpass123')
        
        # Then refresh
        result = AuthenticationService.refresh_token(login_result['refresh_token'])
        
        assert 'access_token' in result
        assert 'refresh_token' in result
    
    def test_refresh_with_invalid_token_fails(self):
        """Test that refresh fails with invalid token."""
        with pytest.raises(BusinessError) as exc_info:
            AuthenticationService.refresh_token('invalid_token')
        
        assert exc_info.value.code == ErrorCodes.AUTH_INVALID_CREDENTIALS


class TestDefaultRolePriority:
    """Tests for default role priority logic."""
    
    def test_admin_is_highest_priority(self, create_user, admin_role, mentor_role):
        """Test that ADMIN is the highest priority role."""
        user = create_user(username='admin_user', password='testpass123')
        UserRole.objects.create(user=user, role=admin_role)
        UserRole.objects.create(user=user, role=mentor_role)
        
        result = AuthenticationService.login('admin_user', 'testpass123')
        
        assert result['current_role'] == 'ADMIN'
    
    def test_mentor_over_student(self, create_user, mentor_role):
        """Test that MENTOR has higher priority than STUDENT."""
        user = create_user(username='mentor_user', password='testpass123')
        UserRole.objects.create(user=user, role=mentor_role)
        
        result = AuthenticationService.login('mentor_user', 'testpass123')
        
        assert result['current_role'] == 'MENTOR'
    
    def test_student_is_default(self, create_user):
        """Test that STUDENT is the default role."""
        create_user(username='student_user', password='testpass123')
        
        result = AuthenticationService.login('student_user', 'testpass123')
        
        assert result['current_role'] == 'STUDENT'
