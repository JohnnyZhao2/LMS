"""
User management views.

Implements:
- User CRUD
- User activation/deactivation
- Role assignment
- Mentor assignment
- Reference data (mentors, departments, roles)

Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 3.5, 3.6
"""
from django.db import models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from apps.users.services import UserManagementService
from apps.users.serializers import (
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    AssignRolesSerializer,
    AssignMentorSerializer,
    MenteeListSerializer,
    DepartmentMemberListSerializer,
    MentorSerializer,
    RoleSerializer,
    DepartmentSerializer,
)
from apps.users.models import User, Role, Department


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
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看用户列表'
            )
        
        queryset = User.objects.select_related('department', 'mentor').prefetch_related('roles').all()
        
        is_active = request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        department_id = request.query_params.get('department_id')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(username__icontains=search) |
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
    serializer_class = UserDetailSerializer
    
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
    serializer_class = UserDetailSerializer
    
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
    """List mentees for the current mentor."""
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
        if not request.user.is_mentor:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有导师可以查看名下学员'
            )
        
        mentees = request.user.get_mentees()
        serializer = MenteeListSerializer(mentees, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DepartmentMembersListView(APIView):
    """List department members for the current department manager."""
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
        if not request.user.is_dept_manager:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有室经理可以查看本室成员'
            )
        
        members = request.user.get_department_members()
        serializer = DepartmentMemberListSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class MentorsListView(APIView):
    """List all mentors (users with MENTOR role)."""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取导师列表',
        description='获取所有具有导师角色的用户列表，用于指定导师',
        responses={
            200: MentorSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def get(self, request):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看导师列表'
            )
        
        mentors = User.objects.filter(
            roles__code='MENTOR',
            is_active=True
        ).distinct().order_by('username')
        
        serializer = MentorSerializer(mentors, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DepartmentsListView(APIView):
    """List all departments."""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取部门列表',
        description='获取所有可用的部门列表，用于创建和编辑用户',
        responses={
            200: DepartmentSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def get(self, request):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看部门列表'
            )
        
        departments = Department.objects.all().order_by('code')
        serializer = DepartmentSerializer(departments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class RolesListView(APIView):
    """List all available roles."""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取角色列表',
        description='获取所有可用的角色列表，用于分配角色',
        responses={
            200: RoleSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def get(self, request):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看角色列表'
            )
        
        roles = Role.objects.exclude(code='STUDENT').order_by('code')
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
