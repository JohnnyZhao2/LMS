"""
Authentication views.
Implements:
- Login / Logout
- Token refresh
- Role switching
- Password change
- Current user info
"""
from django.conf import settings
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.base_view import BaseAPIView
from core.responses import success_response
from core.throttles import AuthThrottle
from apps.auth.serializers import (
    AuthSessionSerializer,
    ChangeMyPasswordRequestSerializer,
    ChangePasswordRequestSerializer,
    LoginRequestSerializer,
    LoginResponseSerializer,
    OneAccountAuthorizeUrlResponseSerializer,
    OneAccountCodeLoginRequestSerializer,
    RefreshTokenRequestSerializer,
    RefreshTokenResponseSerializer,
    SwitchRoleRequestSerializer,
)
from apps.auth.services import AuthenticationService


def _refresh_cookie_token(request):
    serializer = RefreshTokenRequestSerializer(data={
        'refresh_token': request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME),
    })
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data['refresh_token']


def _session_response(result, *, message=None):
    payload = dict(result)
    refresh_token = payload.pop('refresh_token')
    response = success_response(payload) if message is None else success_response(payload, message=message)
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=settings.AUTH_REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        secure=settings.AUTH_REFRESH_COOKIE_SECURE,
        samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
    )
    return response


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
        return _session_response(result)


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
        request=None,
        responses={
            200: OpenApiResponse(description='登出成功'),
        },
        tags=['认证']
    )
    def post(self, request):
        self.service.logout(request.user, _refresh_cookie_token(request))
        response = success_response(message='登出成功')
        response.delete_cookie(
            settings.AUTH_REFRESH_COOKIE_NAME,
            path=settings.AUTH_REFRESH_COOKIE_PATH,
            samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
        )
        return response


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
        request=None,
        responses={
            200: RefreshTokenResponseSerializer,
            400: OpenApiResponse(description='刷新令牌无效'),
        },
        tags=['认证']
    )
    def post(self, request):
        result = self.service.refresh_token(
            refresh_token=_refresh_cookie_token(request),
        )
        return _session_response(result)


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
        return _session_response(result)


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
            200: AuthSessionSerializer,
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


class ChangePasswordView(BaseAPIView):
    """
    Admin password change endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = AuthenticationService

    @extend_schema(
        summary='修改用户密码',
        description='管理员为指定用户设置新密码',
        request=ChangePasswordRequestSerializer,
        responses={
            200: OpenApiResponse(description='密码修改成功'),
            403: OpenApiResponse(description='无权限执行此操作'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = ChangePasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        self.service.change_password(
            operator=request.user,
            target_user_id=serializer.validated_data['user_id'],
            password=serializer.validated_data['password'],
        )

        return success_response(message='密码已修改')


class ChangeMyPasswordView(BaseAPIView):
    """
    Current user password change endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = AuthenticationService

    @extend_schema(
        summary='修改当前用户密码',
        description='当前登录用户验证旧密码后设置新密码，返回新的登录令牌',
        request=ChangeMyPasswordRequestSerializer,
        responses={
            200: LoginResponseSerializer,
            400: OpenApiResponse(description='参数无效'),
            401: OpenApiResponse(description='当前密码错误或未登录'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = ChangeMyPasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = self.service.change_my_password(
            user=request.user,
            current_password=serializer.validated_data['current_password'],
            password=serializer.validated_data['password'],
        )

        return _session_response(result, message='密码已修改')


class OneAccountAuthorizeUrlView(BaseAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    service_class = AuthenticationService

    @extend_schema(
        summary='获取统一认证扫码登录地址',
        description='返回统一认证扫码登录跳转地址',
        responses={
            200: OneAccountAuthorizeUrlResponseSerializer,
        },
        tags=['认证']
    )
    def get(self, request):
        result = self.service.get_one_account_authorize_url()
        return success_response(result)


class OneAccountCodeLoginView(BaseAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [AuthThrottle]
    service_class = AuthenticationService

    @extend_schema(
        summary='统一认证授权码登录',
        description='使用统一认证回调code登录并换发本系统JWT',
        request=OneAccountCodeLoginRequestSerializer,
        responses={
            200: LoginResponseSerializer,
            401: OpenApiResponse(description='授权码无效或统一认证失败'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = OneAccountCodeLoginRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = self.service.login_by_one_account_code(code=serializer.validated_data['code'])
        return _session_response(result)
