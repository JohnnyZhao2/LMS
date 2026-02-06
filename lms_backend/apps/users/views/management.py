"""
User management views.
Implements:
- User CRUD
- User activation/deactivation
- Role assignment
- Mentor assignment
- Reference data (mentors, departments, roles)
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.permissions import get_accessible_students, get_current_role
from apps.users.selectors import (
    get_user_by_id,
    list_departments,
    list_mentors,
    list_roles,
    list_users,
    list_users_needing_attention,
)
from apps.users.serializers import (
    AssignMentorSerializer,
    AssignRolesSerializer,
    DepartmentMemberListSerializer,
    DepartmentSerializer,
    MenteeListSerializer,
    MentorSerializer,
    RoleSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)
from apps.users.services import UserManagementService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.responses import no_content_response


class UserListCreateView(APIView):
    """
    User list and create endpoint.
    """
    permission_classes = [IsAuthenticated]
    @extend_schema(
        summary='获取用户列表',
        description='获取所有用户列表（仅管理员）',
        parameters=[
            OpenApiParameter(name='is_active', type=bool, description='按激活状态筛选'),
            OpenApiParameter(name='department_id', type=int, description='按部门筛选'),
            OpenApiParameter(name='search', type=str, description='搜索姓名或工号'),
            OpenApiParameter(name='filter', type=str, description='筛选条件：needs_attention'),
        ],
        responses={
            200: UserListSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理']
    )
    def get(self, request):
        current_role = get_current_role(request.user, request)
        if current_role != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看用户列表'
            )
        is_active = request.query_params.get('is_active')
        is_active_bool = None
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
        filter_code = request.query_params.get('filter')
        department_id = request.query_params.get('department_id')
        search = request.query_params.get('search')
        if filter_code == 'needs_attention':
            student_ids = list(
                get_accessible_students(request.user, current_role, request).values_list('id', flat=True)
            )
            queryset = list_users_needing_attention(
                student_ids=student_ids,
                is_active=is_active_bool,
                department_id=department_id,
                search=search,
            )
        else:
            queryset = list_users(
                is_active=is_active_bool,
                department_id=department_id,
                search=search,
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以创建用户'
            )
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_serializer = UserDetailSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
class UserDetailView(APIView):
    """
    User detail, update, delete endpoint.
    """
    permission_classes = [IsAuthenticated]
    def get_object(self, pk):
        user = get_user_by_id(pk)
        if not user:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在'
            )
        return user
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
        if get_current_role(request.user, request) != 'ADMIN':
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以更新用户信息'
            )
        user = self.get_object(pk)
        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        response_serializer = UserDetailSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary='删除用户',
        description='彻底删除离职（已停用）用户及其全部关联数据',
        responses={
            204: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='参数错误或用户状态不允许删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理']
    )
    def delete(self, request, pk):
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以删除用户'
            )

        service = UserManagementService(request)
        service.delete_user(pk)
        return no_content_response()
class UserDeactivateView(BaseAPIView):
    """
    User deactivation endpoint.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserDetailSerializer
    service_class = UserManagementService
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以停用用户'
            )
        user = self.service.deactivate_user(pk)
        serializer = UserDetailSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
class UserActivateView(BaseAPIView):
    """
    User activation endpoint.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = UserDetailSerializer
    service_class = UserManagementService
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以启用用户'
            )
        user = self.service.activate_user(pk)
        serializer = UserDetailSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
class UserAssignRolesView(BaseAPIView):
    """
    Role assignment endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以分配角色'
            )
        serializer = AssignRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.service.assign_roles(
            user_id=pk,
            role_codes=serializer.validated_data['role_codes'],
            assigned_by=request.user
        )
        response_serializer = UserDetailSerializer(user)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
class UserAssignMentorView(BaseAPIView):
    """
    Mentor assignment endpoint.
    """
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以指定导师'
            )
        serializer = AssignMentorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.service.assign_mentor(
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
        if get_current_role(request.user, request) != 'MENTOR':
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
        if get_current_role(request.user, request) != 'DEPT_MANAGER':
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看导师列表'
            )
        mentors = list_mentors()
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看部门列表'
            )
        departments = list_departments()
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
        if get_current_role(request.user, request) != 'ADMIN':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以查看角色列表'
            )
        roles = list_roles(exclude_student=True)
        serializer = RoleSerializer(roles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
