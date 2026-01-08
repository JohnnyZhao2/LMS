"""
Authentication services for LMS.
Implements:
- Login/logout logic
- JWT token generation and validation
- Role switching
- Inactive user login rejection
"""
from typing import Optional, Dict, Any, List
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from core.exceptions import BusinessError, ErrorCodes
from core.base_service import BaseService
from apps.users.models import User, Role
from apps.users.serializers import UserInfoSerializer
from apps.users.repositories import UserRepository


class AuthenticationService(BaseService):
    """
    Authentication service handling login, logout, and role switching.
    """
    def __init__(self):
        """初始化服务，注入依赖"""
        self.user_repository = UserRepository()

    def login(self, employee_id: str, password: str) -> Dict[str, Any]:
        """
        Authenticate user and generate JWT tokens.
        Args:
            employee_id: User's employee ID
            password: User's password
        Returns:
            Dict containing tokens, user info, and available roles
        Raises:
            BusinessError: If credentials are invalid or user is inactive
        Properties:
        - Property 1: 有效凭证登录成功
        - Property 2: 登录返回完整角色列表
        - Property 3: 停用用户登录拒绝
        """
        # First, check if user exists and is active (Property 3)
        # We need to do this separately because Django's authenticate()
        # returns None for both invalid credentials AND inactive users
        user_obj = self.user_repository.get_by_employee_id(employee_id)
        if user_obj and not user_obj.is_active:
            raise BusinessError(
                code=ErrorCodes.AUTH_USER_INACTIVE,
                message='用户账号已被停用'
            )
        # Authenticate user using employee_id as username
        user = authenticate(username=employee_id, password=password)
        if user is None:
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='工号或密码错误'
            )
        # Update last_login timestamp
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        # Generate JWT tokens
        tokens = self._generate_tokens(user)
        # Get available roles (Property 2)
        available_roles = self._get_user_roles(user)
        # Determine default/current role (highest privilege role)
        current_role = self._get_default_role(available_roles)
        # Use serializer to build user info
        user_info = UserInfoSerializer(user).data
        return {
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh'],
            'user': user_info,
            'available_roles': available_roles,
            'current_role': current_role,
        }

    def logout(self, user: User, refresh_token: Optional[str] = None) -> bool:
        """
        Logout user by blacklisting their refresh token.
        Args:
            user: The user to logout
            refresh_token: Optional refresh token to blacklist
        Returns:
            True if logout successful
        """
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, InvalidToken, ValueError):
                # Token might already be blacklisted or invalid
                # These are expected errors during logout, so we silently ignore them
                pass
        return True

    def refresh_token(self, refresh_token: str) -> Dict[str, str]:
        """
        Refresh access token using refresh token.
        Args:
            refresh_token: Valid refresh token
        Returns:
            Dict containing new access and refresh tokens
        Raises:
            BusinessError: If refresh token is invalid
        """
        try:
            token = RefreshToken(refresh_token)
            user_id = token['user_id'] if 'user_id' in token else None
            if not user_id:
                raise BusinessError(
                    code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                    message='无效的刷新令牌'
                )
            user = self.user_repository.get_by_id(user_id)
            if not user or not user.is_active:
                raise BusinessError(
                    code=ErrorCodes.AUTH_USER_INACTIVE,
                    message='用户账号已被停用'
                )
            return {
                'access_token': str(token.access_token),
                'refresh_token': str(token),
            }
        except BusinessError:
            raise
        except Exception:
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='无效的刷新令牌'
            )

    def switch_role(self, user: User, role_code: str) -> Dict[str, Any]:
        """
        Switch user's current active role.
        Args:
            user: The user switching roles
            role_code: The role code to switch to
        Returns:
            Dict containing new tokens and updated role info
        Raises:
            BusinessError: If user doesn't have the requested role
        Properties:
        - Property 4: 角色切换权限生效
        """
        # Verify user has the requested role
        if not user.is_active:
            raise BusinessError(
                code=ErrorCodes.AUTH_USER_INACTIVE,
                message='用户账号已被停用'
            )
        if not user.has_role(role_code):
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_ROLE,
                message=f'用户没有 {role_code} 角色权限'
            )
        # Generate new tokens with role claim
        tokens = self._generate_tokens(user, current_role=role_code)
        # Get available roles
        available_roles = self._get_user_roles(user)
        # Use serializer to build user info
        user_info = UserInfoSerializer(user).data
        return {
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh'],
            'user': user_info,
            'available_roles': available_roles,
            'current_role': role_code,
        }

    def _generate_tokens(self, user: User, current_role: Optional[str] = None) -> Dict[str, str]:
        """
        Generate JWT tokens for user.
        Args:
            user: The user to generate tokens for
            current_role: Optional current role to include in token
        Returns:
            Dict containing access and refresh tokens
        """
        refresh = RefreshToken.for_user(user)
        # Add custom claims
        refresh['employee_id'] = user.employee_id
        refresh['username'] = user.username  # username 字段存储显示名称
        refresh['roles'] = user.role_codes
        if current_role:
            refresh['current_role'] = current_role
        else:
            # Set default role
            refresh['current_role'] = self._get_default_role(
                self._get_user_roles(user)
            )
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

    def _get_user_roles(self, user: User) -> List[Dict[str, str]]:
        """
        Get all roles for a user.
        Args:
            user: The user to get roles for
        Returns:
            List of role dicts with code and name
        """
        return [
            {'code': role.code, 'name': role.name}
            for role in user.roles.all()
        ]

    def _get_default_role(self, roles: List[Dict[str, str]]) -> str:
        """
        Determine the default role for a user based on role priority.
        Uses Role.ROLE_PRIORITY_ORDER to determine priority.
        Args:
            roles: List of role dicts
        Returns:
            The highest priority role code
        """
        role_codes = {r['code'] for r in roles}
        # Use the priority order from Role model
        for role_code in Role.ROLE_PRIORITY_ORDER:
            if role_code in role_codes:
                return role_code
        # Fallback to STUDENT if no roles found (shouldn't happen)
        return 'STUDENT'

    def blacklist_all_tokens(self, user: User) -> int:
        """
        Blacklist all outstanding tokens for a user.
        Args:
            user: The user
        Returns:
            Number of tokens blacklisted
        """
        tokens = OutstandingToken.objects.filter(user=user)
        count = 0
        for token in tokens:
            _, created = BlacklistedToken.objects.get_or_create(token=token)
            if created:
                count += 1
        return count
