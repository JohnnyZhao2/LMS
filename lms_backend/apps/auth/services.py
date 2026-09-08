"""
Authentication services for LMS.
Implements:
- Login/logout logic
- JWT token generation and validation
- Inactive user login rejection
"""
from typing import Any, Dict, NoReturn, Optional

from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from apps.activity_logs.registry import register_user_log_action
from apps.activity_logs.services import ActivityLogService
from apps.auth.one_account import OneAccountClient
from apps.authorization.engine import get_engine
from apps.authorization.roles import serialize_user_roles
from apps.authorization.services import AuthorizationService
from apps.users.models import User
from apps.users.selectors import get_user_by_employee_id, get_user_by_id
from apps.users.serializers import UserInfoSerializer
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

register_user_log_action('login', group='认证', label='登录成功')
register_user_log_action('login_failed', group='认证', label='登录失败')
register_user_log_action('logout', group='认证', label='登出')
register_user_log_action('password_change', group='账号管理', label='修改密码')


class AuthenticationService(BaseService):
    """
    Authentication service handling login and logout.
    """
    def __init__(self, request):
        super().__init__(request)
        self.one_account_client = OneAccountClient()

    def _log_user_action(
        self,
        *,
        user: User,
        action: str,
        description: str,
        operator: Optional[User] = None,
        status: str = 'success',
    ) -> None:
        ActivityLogService.log_user_action(
            user=user,
            operator=operator,
            action=action,
            description=description,
            status=status,
        )

    def _validate_active_user(self, user: Optional[User]) -> User:
        user_obj = self.validate_not_none(user, '用户不存在')
        if not user_obj.is_active:
            raise BusinessError(
                code=ErrorCodes.AUTH_USER_INACTIVE,
                message='用户账号已被停用',
            )
        return user_obj

    def _raise_login_error(
        self,
        *,
        user: Optional[User],
        description: str,
        code: str,
        message: str,
    ) -> NoReturn:
        if user is not None:
            self._log_user_action(
                user=user,
                action='login_failed',
                description=description,
                status='failed',
            )
        raise BusinessError(code=code, message=message)

    def _build_user_payload(self, user: User) -> Dict[str, Any]:
        authorization_service = AuthorizationService(self.request)
        return {
            'user': UserInfoSerializer(user).data,
            'roles': serialize_user_roles(user),
            'capabilities': sorted(
                authorization_service.get_user_permission_codes(user=user)
            ),
        }

    def _build_auth_payload(self, user: User) -> Dict[str, Any]:
        user_payload = self._build_user_payload(user)
        tokens = self._generate_tokens(user)
        return {
            'access_token': tokens['access'],
            'refresh_token': tokens['refresh'],
            **user_payload,
        }

    def _finalize_login(
        self,
        user: User,
        *,
        description: str,
    ) -> Dict[str, Any]:
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        self._log_user_action(
            user=user,
            action='login',
            description=description,
            status='success',
        )
        return self._build_auth_payload(user)

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
        """
        user_obj = get_user_by_employee_id(employee_id)
        if user_obj and not user_obj.is_active:
            self._raise_login_error(
                user=user_obj,
                description=f'原因：账号已停用；账号：{user_obj.username}（{user_obj.employee_id}）',
                code=ErrorCodes.AUTH_USER_INACTIVE,
                message='用户账号已被停用',
            )

        user = authenticate(username=employee_id, password=password)
        if user is None:
            self._raise_login_error(
                user=user_obj,
                description=(
                    f'原因：密码错误；账号：{user_obj.username}（{user_obj.employee_id}）'
                    if user_obj is not None
                    else f'原因：工号不存在；工号：{employee_id}'
                ),
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='工号或密码错误',
            )

        authenticated_user = self._validate_active_user(user)
        return self._finalize_login(
            authenticated_user,
            description=f'账号：{authenticated_user.username}（{authenticated_user.employee_id}）',
        )

    def get_one_account_authorize_url(self) -> Dict[str, str]:
        authorize_url = self.one_account_client.build_authorize_url()
        return {
            'authorize_url': authorize_url,
        }

    def login_by_one_account_code(self, code: str) -> Dict[str, Any]:
        one_account_result = self.one_account_client.exchange_code(code=code)
        employee_id = one_account_result['employee_id']
        user_obj = get_user_by_employee_id(employee_id)
        authenticated_user = self._validate_active_user(user_obj)
        return self._finalize_login(
            authenticated_user,
            description=f'统一认证扫码登录：账号：{authenticated_user.username}（{authenticated_user.employee_id}）',
        )

    def logout(self, user: User, refresh_token: str) -> None:
        """
        Logout user by blacklisting their refresh token.
        Args:
            user: The user to logout
            refresh_token: Refresh token to blacklist
        """
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except (TokenError, InvalidToken, ValueError, TypeError) as exc:
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='无效的刷新令牌',
            ) from exc

        self._log_user_action(
            user=user,
            action='logout',
            description=f'账号：{user.username}（{user.employee_id}）',
            status='success',
        )

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

            user = self._validate_active_user(get_user_by_id(user_id))
            tokens = self._generate_tokens(user)

            # 轮换 refresh token：生成新 token 后立刻失效旧 token
            incoming_token.blacklist()
            return {
                'access_token': tokens['access'],
                'refresh_token': tokens['refresh'],
            }
        except BusinessError:
            raise
        except (TokenError, InvalidToken, ValueError, TypeError):
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='无效的刷新令牌',
            )

    def get_me(self, user: User) -> Dict[str, Any]:
        active_user = self._validate_active_user(get_user_by_id(user.id))
        return self._build_user_payload(active_user)

    def change_password(self, operator: User, target_user_id: int, password: str) -> None:
        target_user = self.validate_not_none(
            get_user_by_id(target_user_id),
            '用户不存在',
        )
        get_engine(self.request).enforce(
            'users.change_user',
            resource=target_user,
            error_message='只有管理员可以修改用户密码',
        )
        target_user.set_password(password)
        target_user.save(update_fields=['password'])
        self.blacklist_all_tokens(target_user)

        self._log_user_action(
            user=target_user,
            operator=operator,
            action='password_change',
            description=f'被操作账号：{target_user.username}（{target_user.employee_id}）',
            status='success',
        )

    def change_my_password(self, user: User, current_password: str, password: str) -> Dict[str, Any]:
        active_user = self._validate_active_user(get_user_by_id(user.id))
        if not active_user.check_password(current_password):
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='当前密码错误',
            )

        active_user.set_password(password)
        active_user.save(update_fields=['password'])
        self.blacklist_all_tokens(active_user)

        self._log_user_action(
            user=active_user,
            operator=active_user,
            action='password_change',
            description=f'账号自助修改密码：{active_user.username}（{active_user.employee_id}）',
            status='success',
        )
        return self._build_auth_payload(active_user)

    def _generate_tokens(self, user: User) -> Dict[str, str]:
        refresh = RefreshToken.for_user(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

    def blacklist_all_tokens(self, user: User) -> None:
        """
        Blacklist all outstanding tokens for a user.
        Args:
            user: The user
        """
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
