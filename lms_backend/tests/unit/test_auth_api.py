"""
API tests for authentication endpoints.

Tests the authentication API endpoints:
- POST /api/auth/login/
- POST /api/auth/logout/
- POST /api/auth/refresh/
- POST /api/auth/switch-role/
- POST /api/auth/reset-password/
- POST /api/auth/change-password/

Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
"""
import pytest
from django.urls import reverse
from rest_framework import status

from apps.users.models import Role, UserRole


class TestLoginAPI:
    """Tests for login endpoint."""
    
    def test_login_success(self, api_client, create_user):
        """
        Test successful login returns tokens and user info.
        
        Requirements: 1.1, 1.2
        """
        create_user(username='testuser', password='testpass123')
        
        response = api_client.post(
            reverse('auth-login'),
            {'username': 'testuser', 'password': 'testpass123'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access_token' in response.data
        assert 'refresh_token' in response.data
        assert 'user' in response.data
        assert 'available_roles' in response.data
        assert 'current_role' in response.data
    
    def test_login_invalid_credentials(self, api_client, create_user):
        """
        Test login fails with invalid credentials.
        
        Requirements: 1.1
        """
        create_user(username='testuser', password='testpass123')
        
        response = api_client.post(
            reverse('auth-login'),
            {'username': 'testuser', 'password': 'wrongpassword'}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'AUTH_INVALID_CREDENTIALS'
    
    def test_login_inactive_user(self, api_client, create_user):
        """
        Test login fails for inactive users.
        
        Requirements: 1.5
        """
        create_user(username='inactive', password='testpass123', is_active=False)
        
        response = api_client.post(
            reverse('auth-login'),
            {'username': 'inactive', 'password': 'testpass123'}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'AUTH_USER_INACTIVE'


class TestLogoutAPI:
    """Tests for logout endpoint."""
    
    def test_logout_success(self, authenticated_client):
        """Test successful logout."""
        response = authenticated_client.post(reverse('auth-logout'))
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == '登出成功'
    
    def test_logout_requires_auth(self, api_client):
        """Test logout requires authentication."""
        response = api_client.post(reverse('auth-logout'))
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRefreshTokenAPI:
    """Tests for token refresh endpoint."""
    
    def test_refresh_success(self, api_client, create_user):
        """Test successful token refresh."""
        create_user(username='testuser', password='testpass123')
        
        # First login
        login_response = api_client.post(
            reverse('auth-login'),
            {'username': 'testuser', 'password': 'testpass123'}
        )
        refresh_token = login_response.data['refresh_token']
        
        # Then refresh
        response = api_client.post(
            reverse('auth-refresh'),
            {'refresh_token': refresh_token}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access_token' in response.data
        assert 'refresh_token' in response.data
    
    def test_refresh_invalid_token(self, api_client):
        """Test refresh fails with invalid token."""
        response = api_client.post(
            reverse('auth-refresh'),
            {'refresh_token': 'invalid_token'}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestSwitchRoleAPI:
    """Tests for role switching endpoint."""
    
    def test_switch_role_success(self, authenticated_client, mentor_role):
        """
        Test successful role switch.
        
        Requirements: 1.3
        """
        user = authenticated_client.user
        UserRole.objects.create(user=user, role=mentor_role)
        
        response = authenticated_client.post(
            reverse('auth-switch-role'),
            {'role_code': 'MENTOR'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['current_role'] == 'MENTOR'
    
    def test_switch_role_invalid(self, authenticated_client):
        """
        Test switch to invalid role fails.
        
        Requirements: 1.3
        """
        response = authenticated_client.post(
            reverse('auth-switch-role'),
            {'role_code': 'ADMIN'}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'AUTH_INVALID_ROLE'
    
    def test_switch_role_requires_auth(self, api_client):
        """Test role switch requires authentication."""
        response = api_client.post(
            reverse('auth-switch-role'),
            {'role_code': 'STUDENT'}
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestResetPasswordAPI:
    """Tests for password reset endpoint."""
    
    def test_reset_password_by_admin(self, api_client, create_user, admin_role):
        """
        Test admin can reset user password.
        
        Requirements: 1.6
        """
        # Create admin user
        admin = create_user(username='admin', password='adminpass')
        UserRole.objects.create(user=admin, role=admin_role)
        
        # Create target user
        target = create_user(username='target', password='oldpass')
        
        # Login as admin
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(admin)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.post(
            reverse('auth-reset-password'),
            {'user_id': target.id}
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'temporary_password' in response.data
        assert len(response.data['temporary_password']) == 12
    
    def test_reset_password_non_admin_fails(self, authenticated_client, create_user):
        """Test non-admin cannot reset password."""
        target = create_user(username='target', password='oldpass')
        
        response = authenticated_client.post(
            reverse('auth-reset-password'),
            {'user_id': target.id}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'PERMISSION_DENIED'


class TestChangePasswordAPI:
    """Tests for password change endpoint."""
    
    def test_change_password_success(self, api_client, create_user):
        """Test user can change their own password."""
        user = create_user(username='testuser', password='oldpass123')
        
        # Login
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        response = api_client.post(
            reverse('auth-change-password'),
            {'old_password': 'oldpass123', 'new_password': 'newpass123'}
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify new password works
        user.refresh_from_db()
        assert user.check_password('newpass123')
    
    def test_change_password_wrong_old_password(self, authenticated_client):
        """Test change password fails with wrong old password."""
        response = authenticated_client.post(
            reverse('auth-change-password'),
            {'old_password': 'wrongpass', 'new_password': 'newpass123'}
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['code'] == 'AUTH_INVALID_CREDENTIALS'
