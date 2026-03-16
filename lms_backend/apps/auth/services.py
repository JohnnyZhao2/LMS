"""
Authentication services for LMS.
Implements:
- Login/logout logic
- JWT token generation and validation
- Role switching
- Inactive user login rejection
"""
import secrets
import string
from typing import Any, Dict, List, Optional

from django.contrib.auth import authenticate
from django.db.models import QuerySet
from django.utils import timezone
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from core.base_service import BaseService
from core.decorators import log_user_action
from core.exceptions import BusinessError, ErrorCodes
from apps.activity_logs.services import ActivityLogService
from apps.authorization.services import AuthorizationService
from apps.users.models import Role, User
from apps.users.permissions import SUPER_ADMIN_ROLE, SUPER_ADMIN_ROLE_NAME
from apps.users.serializers import UserInfoSerializer


class AuthenticationService(BaseService):
    """
    Authentication service handling login, logout, and role switching.
    """
    TEMP_PASSWORD_LENGTH = 12

    def _user_queryset(self) -> QuerySet[User]:
        return User.objects.select_related(
            'department',
            'mentor'
        ).prefetch_related('roles')

    def _get_user_by_employee_id(self, employee_id: str) -> Optional[User]:
        return self._user_queryset().filter(employee_id=employee_id).first()

    def _get_user_by_id(self, user_id: int) -> Optional[User]:
        return self._user_queryset().filter(pk=user_id).first()

    def _log_user_action_safely(
        self,
        *,
        user: User,
        action: str,
        description: str,
        operator: Optional[User] = None,
        status: str = 'success',
    ) -> None:
        try:
            ActivityLogService.log_user_action(
                user=user,
                operator=operator,
                action=action,
                description=description,
                status=status,
            )
        except Exception:
            # 日志异常不影响主流程
            pass

    def _validate_active_user(self, user: Optional[User]) -> User:
        user_obj = self.validate_not_none(user, '用户不存在')
        if not user_obj.is_active:
            raise BusinessError(
                code=ErrorCodes.AUTH_USER_INACTIVE,
                message='用户账号已被停用',
            )
        return user_obj

    def _resolve_current_role(
        self,
        available_roles: List[Dict[str, str]],
        requested_role: Optional[str] = None,
    ) -> str:
        role_codes = {role['code'] for role in available_roles}
        if requested_role and requested_role in role_codes:
            return requested_role
        return self._get_default_role(available_roles)

    def _build_user_payload(
        self,
        user: User,
        requested_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        available_roles = self._get_user_roles(user)
        if user.is_superuser:
            current_role = SUPER_ADMIN_ROLE
        else:
            current_role = self._resolve_current_role(
                available_roles=available_roles,
                requested_role=requested_role,
            )
        authorization_service = AuthorizationService(self.request)
        effective_permissions = authorization_service.get_effective_permission_codes(
            current_role=current_role,
            user=user,
        )
        return {
            'user': UserInfoSerializer(user).data,
            'available_roles': available_roles,
            'current_role': current_role,
            'effective_permissions': effective_permissions,
        }

    def _build_auth_payload(
        self,
        user: User,
        requested_role: Optional[str] = None,
    ) -> Dict[str, Any]:
        user_payload = self._build_user_payload(user, requested_role=requested_role)
        tokens = self._generate_tokens(user, current_role=user_payload['current_role'])
        return {
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh'],
            **user_payload,
        }

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
        user_obj = self._get_user_by_employee_id(employee_id)
        if user_obj and not user_obj.is_active:
            self._log_user_action_safely(
                user=user_obj,
                action='login_failed',
                description=f'用户 {employee_id} 尝试登录，但账号已被停用',
                status='failed',
            )
            raise BusinessError(
                code=ErrorCodes.AUTH_USER_INACTIVE,
                message='用户账号已被停用',
            )

        # Authenticate user using employee_id as username
        user = authenticate(username=employee_id, password=password)
        if user is None:
            if user_obj:
                self._log_user_action_safely(
                    user=user_obj,
                    action='login_failed',
                    description=f'用户 {employee_id} 登录失败：密码错误',
                    status='failed',
                )
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='工号或密码错误',
            )

        authenticated_user = self._validate_active_user(self._get_user_by_id(user.id))
        authenticated_user.last_login = timezone.now()
        authenticated_user.save(update_fields=['last_login'])

        self._log_user_action_safely(
            user=authenticated_user,
            action='login',
            description=f'用户 {employee_id} 登录成功',
            status='success',
        )
        return self._build_auth_payload(authenticated_user)

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

        self._log_user_action_safely(
            user=user,
            action='logout',
            description=f'用户 {user.employee_id} 登出系统',
            status='success',
        )

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
            incoming_token = RefreshToken(refresh_token)
            user_id = incoming_token.get('user_id')
            if not user_id:
                raise BusinessError(
                    code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                    message='无效的刷新令牌',
                )

            user = self._validate_active_user(self._get_user_by_id(user_id))
            requested_role = incoming_token.get('current_role')
            tokens = self._build_auth_payload(user, requested_role=requested_role)

            # 轮换 refresh token：生成新 token 后立刻失效旧 token
            incoming_token.blacklist()
            return {
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
            }
        except BusinessError:
            raise
        except (TokenError, InvalidToken, ValueError, TypeError):
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='无效的刷新令牌',
            )

    @log_user_action('switch_role', '切换角色为 {role_code}')
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
        active_user = self._validate_active_user(self._get_user_by_id(user.id))
        if active_user.is_superuser:
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_ROLE,
                message='超管账号为专有角色，不支持角色切换',
            )
        if not active_user.has_role(role_code):
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_ROLE,
                message=f'用户没有 {role_code} 角色权限',
            )
        return self._build_auth_payload(active_user, requested_role=role_code)

    def get_me(self, user: User, requested_role: Optional[str] = None) -> Dict[str, Any]:
        active_user = self._validate_active_user(self._get_user_by_id(user.id))
        return self._build_user_payload(active_user, requested_role=requested_role)

    def reset_password(self, operator: User, target_user_id: int) -> Dict[str, str]:
        AuthorizationService(self.request).enforce(
            'user.account.manage',
            error_message='只有管理员可以重置用户密码',
        )

        target_user = self.validate_not_none(
            self._get_user_by_id(target_user_id),
            '用户不存在',
        )
        temporary_password = self.generate_temporary_password()
        target_user.set_password(temporary_password)
        target_user.save(update_fields=['password'])
        self.blacklist_all_tokens(target_user)

        self._log_user_action_safely(
            user=target_user,
            operator=operator,
            action='password_change',
            description=(
                f'管理员 {operator.employee_id} 重置了用户 '
                f'{target_user.employee_id} 的密码'
            ),
            status='success',
        )
        return {'temporary_password': temporary_password}

    def generate_temporary_password(self, length: int = TEMP_PASSWORD_LENGTH) -> str:
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

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
        if user.is_superuser:
            refresh['roles'] = [SUPER_ADMIN_ROLE]
            refresh['current_role'] = SUPER_ADMIN_ROLE
        else:
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
        if user.is_superuser:
            return [{'code': SUPER_ADMIN_ROLE, 'name': SUPER_ADMIN_ROLE_NAME}]
        return [{'code': role.code, 'name': role.name} for role in user.roles.all()]

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
        if SUPER_ADMIN_ROLE in role_codes:
            return SUPER_ADMIN_ROLE
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
