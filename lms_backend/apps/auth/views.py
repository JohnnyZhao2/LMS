"""
Authentication views.
Implements:
- Login / Logout
- Token refresh
- Role switching
- Password reset
- Current user info
"""
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.base_view import BaseAPIView
from core.responses import success_response
from core.throttles import AuthThrottle
from apps.auth.serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    LogoutRequestSerializer,
    MeResponseSerializer,
    OidcAuthorizeUrlResponseSerializer,
    OidcCodeLoginRequestSerializer,
    RefreshTokenRequestSerializer,
    RefreshTokenResponseSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordResponseSerializer,
    SwitchRoleRequestSerializer,
)
from apps.auth.services import AuthenticationService


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
        return success_response(result)


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
        return success_response(message='登出成功')


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
        return success_response(result)


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
            200: LoginResponseSerializer,
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
        return success_response(result)


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
            200: MeResponseSerializer,
            401: OpenApiResponse(description='未登录'),
        },
        tags=['认证']
    )
    def get(self, request):
        result = self.service.get_me(
            user=request.user,
            requested_role=getattr(request.user, 'current_role', None),
        )
        return success_response(result)


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
        serializer = ResetPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = self.service.reset_password(
            operator=request.user,
            target_user_id=serializer.validated_data['user_id'],
        )

        return success_response(
            data=result,
            message='密码已重置，请通知用户使用临时密码登录并修改密码'
        )


class OidcAuthorizeUrlView(BaseAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    service_class = AuthenticationService

    @extend_schema(
        summary='获取统一认证扫码登录地址',
        description='返回统一认证扫码登录跳转地址和state',
        responses={
            200: OidcAuthorizeUrlResponseSerializer,
        },
        tags=['认证']
    )
    def get(self, request):
        result = self.service.get_oidc_authorize_url()
        return success_response(result)


class OidcCodeLoginView(BaseAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    service_class = AuthenticationService

    @extend_schema(
        summary='统一认证授权码登录',
        description='使用统一认证回调code登录并换发本系统JWT',
        request=OidcCodeLoginRequestSerializer,
        responses={
            200: LoginResponseSerializer,
            400: OpenApiResponse(description='授权码无效或统一认证失败'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = OidcCodeLoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = self.service.login_by_oidc_code(code=serializer.validated_data['code'])
        return success_response(result)
