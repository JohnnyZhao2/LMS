"""
Authentication views.

Implements:
- Login / Logout
- Token refresh
- Role switching
- Password reset / change
- Current user info

Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
"""
import secrets
import string

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse

from core.exceptions import BusinessError, ErrorCodes
from apps.users.services import AuthenticationService
from apps.users.serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    LogoutRequestSerializer,
    RefreshTokenRequestSerializer,
    RefreshTokenResponseSerializer,
    SwitchRoleRequestSerializer,
    SwitchRoleResponseSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordResponseSerializer,
    UserInfoSerializer,
)
from apps.users.models import User


class LoginView(APIView):
    """
    User login endpoint.
    
    Requirements:
    - 1.1: WHEN 用户提交有效的登录凭证 THEN LMS SHALL 验证凭证并创建用户会话
    - 1.2: WHEN 用户登录成功 THEN LMS SHALL 返回用户的所有可用角色列表
    - 1.5: IF 用户账号被停用 THEN LMS SHALL 拒绝登录请求并返回明确的错误信息
    """
    permission_classes = [AllowAny]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.auth_service = AuthenticationService()
    
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
        
        result = self.auth_service.login(
            employee_id=serializer.validated_data['employee_id'],
            password=serializer.validated_data['password']
        )
        
        return Response(result, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    User logout endpoint.
    
    Blacklists the refresh token to invalidate the session.
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.auth_service = AuthenticationService()
    
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
        self.auth_service.logout(request.user, refresh_token)
        
        return Response(
            {'message': '登出成功'},
            status=status.HTTP_200_OK
        )


class RefreshTokenView(APIView):
    """
    Token refresh endpoint.
    
    Generates new access and refresh tokens using a valid refresh token.
    """
    permission_classes = [AllowAny]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.auth_service = AuthenticationService()
    
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
        
        result = self.auth_service.refresh_token(
            refresh_token=serializer.validated_data['refresh_token']
        )
        
        return Response(result, status=status.HTTP_200_OK)


class SwitchRoleView(APIView):
    """
    Role switching endpoint.
    
    Requirements:
    - 1.3: WHEN 高权限用户切换角色 THEN LMS SHALL 实时刷新菜单、路由和接口权限
    - 1.4: WHEN 用户切换角色 THEN LMS SHALL 清除前一角色的所有状态数据
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.auth_service = AuthenticationService()
    
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
        
        result = self.auth_service.switch_role(
            user=request.user,
            role_code=serializer.validated_data['role_code']
        )
        
        return Response(result, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    获取当前登录用户信息。
    
    用于页面刷新时同步最新的用户信息和角色列表。
    """
    permission_classes = [IsAuthenticated]
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.auth_service = AuthenticationService()
    
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
        available_roles = self.auth_service._get_user_roles(user)
        
        # 获取当前角色（从 JWT token 中）
        current_role = getattr(request.user, 'current_role', None)
        if not current_role:
            current_role = self.auth_service._get_default_role(available_roles)
        
        # Use serializer to build user info
        user_info = UserInfoSerializer(user).data
        
        return Response({
            'user': user_info,
            'available_roles': available_roles,
            'current_role': current_role,
        }, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    """
    Admin password reset endpoint.
    
    Requirements:
    - 1.6: WHEN 管理员重置用户密码 THEN LMS SHALL 生成临时密码并要求用户首次登录时修改
    """
    permission_classes = [IsAuthenticated]
    
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
        if not request.user.is_admin:
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
        
        return Response({
            'temporary_password': temp_password,
            'message': '密码已重置，请通知用户使用临时密码登录并修改密码'
        }, status=status.HTTP_200_OK)
    
    def _generate_temporary_password(self, length=12):
        """Generate a random temporary password."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

