"""
Authentication views.
Implements:
- Login / Logout
- Token refresh
- Role switching
- Password reset / change
- Current user info
"""
import secrets
import string

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.activity_logs.services import ActivityLogService
from apps.auth.serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    LogoutRequestSerializer,
    RefreshTokenRequestSerializer,
    RefreshTokenResponseSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordResponseSerializer,
    SwitchRoleRequestSerializer,
    SwitchRoleResponseSerializer,
)
from apps.auth.services import AuthenticationService
from apps.users.models import User
from apps.users.permissions import get_current_role
from apps.users.serializers import UserInfoSerializer
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.throttles import AuthThrottle


class LoginView(BaseAPIView):
    """
    User login endpoint.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    service_class = AuthenticationService
    @extend_schema(
        summary='用户登录',
        description='验证用户凭证并返回JWT令牌和用户信息',
        request=LoginRequestSerializer,
        responses={
            200: LoginResponseSerializer,
            400: OpenApiResponse(description='凭证无效或用户已停用'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.service.login(
            employee_id=serializer.validated_data['employee_id'],
            password=serializer.validated_data['password']
        )
        return Response(result, status=status.HTTP_200_OK)
class LogoutView(BaseAPIView):
    """
    User logout endpoint.
    Blacklists the refresh token to invalidate the session.
    """
    permission_classes = [IsAuthenticated]
    service_class = AuthenticationService
    @extend_schema(
        summary='用户登出',
        description='登出当前用户，使刷新令牌失效',
        request=LogoutRequestSerializer,
        responses={
            200: OpenApiResponse(description='登出成功'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = LogoutRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data.get('refresh_token')
        self.service.logout(request.user, refresh_token)
        return Response(
            {'message': '登出成功'},
            status=status.HTTP_200_OK
        )
class RefreshTokenView(BaseAPIView):
    """
    Token refresh endpoint.
    Generates new access and refresh tokens using a valid refresh token.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    service_class = AuthenticationService
    @extend_schema(
        summary='刷新令牌',
        description='使用刷新令牌获取新的访问令牌',
        request=RefreshTokenRequestSerializer,
        responses={
            200: RefreshTokenResponseSerializer,
            400: OpenApiResponse(description='刷新令牌无效'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = RefreshTokenRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.service.refresh_token(
            refresh_token=serializer.validated_data['refresh_token']
        )
        return Response(result, status=status.HTTP_200_OK)
class SwitchRoleView(BaseAPIView):
    """
    Role switching endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = AuthenticationService
    @extend_schema(
        summary='切换角色',
        description='切换当前用户的生效角色，返回新的令牌',
        request=SwitchRoleRequestSerializer,
        responses={
            200: SwitchRoleResponseSerializer,
            400: OpenApiResponse(description='用户没有该角色权限'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = SwitchRoleRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.service.switch_role(
            user=request.user,
            role_code=serializer.validated_data['role_code']
        )
        return Response(result, status=status.HTTP_200_OK)
class MeView(BaseAPIView):
    """
    获取当前登录用户信息。
    用于页面刷新时同步最新的用户信息和角色列表。
    """
    permission_classes = [IsAuthenticated]
    service_class = AuthenticationService
    @extend_schema(
        summary='获取当前用户信息',
        description='获取当前登录用户的最新信息和角色列表',
        responses={
            200: LoginResponseSerializer,
            401: OpenApiResponse(description='未登录'),
        },
        tags=['认证']
    )
    def get(self, request):
        user = request.user
        available_roles = self.service._get_user_roles(user)
        # 获取当前角色（从 JWT token 中）
        current_role = getattr(request.user, 'current_role', None)
        role_codes = {role['code'] for role in available_roles}
        if not current_role or current_role not in role_codes:
            current_role = self.service._get_default_role(available_roles)
        # Use serializer to build user info
        user_info = UserInfoSerializer(user).data
        return Response({
            'user': user_info,
            'available_roles': available_roles,
            'current_role': current_role,
        }, status=status.HTTP_200_OK)
class ResetPasswordView(BaseAPIView):
    """
    Admin password reset endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = AuthenticationService
    @extend_schema(
        summary='重置用户密码',
        description='管理员重置指定用户的密码，生成临时密码',
        request=ResetPasswordRequestSerializer,
        responses={
            200: ResetPasswordResponseSerializer,
            403: OpenApiResponse(description='无权限执行此操作'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['认证']
    )
    def post(self, request):
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以重置用户密码'
            )
        serializer = ResetPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data['user_id']
        try:
            target_user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
        temp_password = self._generate_temporary_password()
        target_user.set_password(temp_password)
        target_user.save()
        self.service.blacklist_all_tokens(target_user)

        # 记录密码重置日志
        try:
            ActivityLogService.log_user_action(
                user=target_user,
                operator=request.user,
                action='password_change',
                description=f'管理员 {request.user.employee_id} 重置了用户 {target_user.employee_id} 的密码',
                status='success'
            )
        except Exception:
            pass  # 日志记录失败不影响主流程

        return Response({
            'temporary_password': temp_password,
            'message': '密码已重置，请通知用户使用临时密码登录并修改密码'
        }, status=status.HTTP_200_OK)
    def _generate_temporary_password(self, length=12):
        """Generate a random temporary password."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))
