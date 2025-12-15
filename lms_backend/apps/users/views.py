"""
Views for user authentication and management.

Implements authentication endpoints:
- Login
- Logout
- Token refresh
- Role switching
- Password reset

Implements user management endpoints:
- User CRUD
- User activation/deactivation
- Role assignment
- Mentor assignment

Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 3.5, 3.6
"""
import secrets
import string

from django.db import models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.generics import ListAPIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from .services import AuthenticationService, UserManagementService
from .serializers import (
    LoginRequestSerializer,
    LoginResponseSerializer,
    LogoutRequestSerializer,
    RefreshTokenRequestSerializer,
    RefreshTokenResponseSerializer,
    SwitchRoleRequestSerializer,
    SwitchRoleResponseSerializer,
    ResetPasswordRequestSerializer,
    ResetPasswordResponseSerializer,
    ChangePasswordRequestSerializer,
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    AssignRolesSerializer,
    AssignMentorSerializer,
    MenteeListSerializer,
    DepartmentMemberListSerializer,
)
from .models import User


class LoginView(APIView):
    """
    User login endpoint.
    
    Requirements:
    - 1.1: WHEN 用户提交有效的登录凭证 THEN LMS SHALL 验证凭证并创建用户会话
    - 1.2: WHEN 用户登录成功 THEN LMS SHALL 返回用户的所有可用角色列表
    - 1.5: IF 用户账号被停用 THEN LMS SHALL 拒绝登录请求并返回明确的错误信息
    """
    permission_classes = [AllowAny]
    
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
        
        result = AuthenticationService.login(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password']
        )
        
        return Response(result, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    User logout endpoint.
    
    Blacklists the refresh token to invalidate the session.
    """
    permission_classes = [IsAuthenticated]
    
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
        AuthenticationService.logout(request.user, refresh_token)
        
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
        
        result = AuthenticationService.refresh_token(
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
        
        result = AuthenticationService.switch_role(
            user=request.user,
            role_code=serializer.validated_data['role_code']
        )
        
        return Response(result, status=status.HTTP_200_OK)



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
        # Check if current user is admin
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
        
        # Generate temporary password
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


class ChangePasswordView(APIView):
    """
    User password change endpoint.
    
    Allows authenticated users to change their own password.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='修改密码',
        description='用户修改自己的密码',
        request=ChangePasswordRequestSerializer,
        responses={
            200: OpenApiResponse(description='密码修改成功'),
            400: OpenApiResponse(description='当前密码错误或新密码不符合要求'),
        },
        tags=['认证']
    )
    def post(self, request):
        serializer = ChangePasswordRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']
        
        # Verify old password
        if not user.check_password(old_password):
            raise BusinessError(
                code=ErrorCodes.AUTH_INVALID_CREDENTIALS,
                message='当前密码错误'
            )
        
        # Set new password
        user.set_password(new_password)
        user.save()
        
        return Response(
            {'message': '密码修改成功'},
            status=status.HTTP_200_OK
        )


# ============ User Management Views ============

class UserListCreateView(APIView):
    """
    User list and create endpoint.
    
    Requirements:
    - 2.1: 创建新用户时存储基础信息并默认分配学员角色
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取用户列表',
        description='获取所有用户列表（仅管理员）',
        parameters=[
            OpenApiParameter(name='is_active', type=bool, description='按激活状态筛选'),
            OpenApiParameter(name='department_id', type=int, description='按部门筛选'),
            OpenApiParameter(name='search', type=str, description='搜索姓名或工号'),
        ],
        responses={
            200: UserListSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def get(self, request):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看用户列表'
            )
        
        queryset = User.objects.select_related('department', 'mentor').prefetch_related('roles').all()
        
        # Filter by is_active
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Filter by department
        department_id = request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        # Search by name or employee_id
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(real_name__icontains=search) |
                models.Q(employee_id__icontains=search)
            )
        
        serializer = UserListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='创建用户',
        description='创建新用户，自动分配学员角色',
        request=UserCreateSerializer,
        responses={
            201: UserDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def post(self, request):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以创建用户'
            )
        
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        response_serializer = UserDetailSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    """
    User detail, update endpoint.
    
    Requirements:
    - 2.2: 更新用户的基础信息和组织归属
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        """Get user by ID."""
        try:
            return User.objects.select_related('department', 'mentor').prefetch_related('roles').get(pk=pk)
        except User.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
    
    @extend_schema(
        summary='获取用户详情',
        description='获取指定用户的详细信息',
        responses={
            200: UserDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理']
    )
    def get(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看用户详情'
            )
        
        user = self.get_object(pk)
        serializer = UserDetailSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='更新用户信息',
        description='更新用户的基础信息和组织归属',
        request=UserUpdateSerializer,
        responses={
            200: UserDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理']
    )
    def patch(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以更新用户信息'
            )
        
        user = self.get_object(pk)
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        response_serializer = UserDetailSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class UserDeactivateView(APIView):
    """
    User deactivation endpoint.
    
    Requirements:
    - 2.3: 停用用户，该用户无法登录且不出现在人员选择器中
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='停用用户',
        description='停用指定用户，用户将无法登录',
        responses={
            200: UserDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理']
    )
    def post(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以停用用户'
            )
        
        user = UserManagementService.deactivate_user(pk)
        serializer = UserDetailSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserActivateView(APIView):
    """
    User activation endpoint.
    
    Requirements:
    - 2.4: 启用已停用用户，恢复登录能力和选择器可见性
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='启用用户',
        description='启用已停用的用户，恢复登录能力',
        responses={
            200: UserDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理']
    )
    def post(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以启用用户'
            )
        
        user = UserManagementService.activate_user(pk)
        serializer = UserDetailSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserAssignRolesView(APIView):
    """
    Role assignment endpoint.
    
    Requirements:
    - 2.6: 在保留默认学员角色的基础上附加其他角色
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='分配角色',
        description='为用户分配角色，学员角色自动保留',
        request=AssignRolesSerializer,
        responses={
            200: UserDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理']
    )
    def post(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以分配角色'
            )
        
        serializer = AssignRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = UserManagementService.assign_roles(
            user_id=pk,
            role_codes=serializer.validated_data['role_codes'],
            assigned_by=request.user
        )
        
        response_serializer = UserDetailSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class UserAssignMentorView(APIView):
    """
    Mentor assignment endpoint.
    
    Requirements:
    - 3.4: 为学员指定导师建立师徒绑定关系
    - 3.5: 解除师徒关系时传入 null
    - 3.6: 一个学员同时只能绑定一个导师
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='指定导师',
        description='为学员指定导师，传入null解除绑定',
        request=AssignMentorSerializer,
        responses={
            200: UserDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理']
    )
    def post(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以指定导师'
            )
        
        serializer = AssignMentorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = UserManagementService.assign_mentor(
            user_id=pk,
            mentor_id=serializer.validated_data.get('mentor_id')
        )
        
        response_serializer = UserDetailSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class MenteesListView(APIView):
    """
    List mentees for the current mentor.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取名下学员',
        description='获取当前导师名下的所有学员',
        responses={
            200: MenteeListSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def get(self, request):
        # Check mentor permission
        if not request.user.is_mentor:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有导师可以查看名下学员'
            )
        
        mentees = request.user.get_mentees()
        serializer = MenteeListSerializer(mentees, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DepartmentMembersListView(APIView):
    """
    List department members for the current department manager.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取本室成员',
        description='获取当前室经理所在室的所有成员',
        responses={
            200: DepartmentMemberListSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def get(self, request):
        # Check department manager permission
        if not request.user.is_dept_manager:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有室经理可以查看本室成员'
            )
        
        members = request.user.get_department_members()
        serializer = DepartmentMemberListSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
