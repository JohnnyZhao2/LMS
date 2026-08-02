from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.engine import enforce, enforce_any, scope_filter
from apps.users.models import Department, Role, User
from apps.users.selectors import get_user_by_id, list_users
from apps.users.serializers import (
    AssignMentorSerializer,
    AssignRolesSerializer,
    AvatarUpdateSerializer,
    DepartmentSerializer,
    MentorSerializer,
    RoleSerializer,
    UserCreateSerializer,
    UserInfoSerializer,
    UserSerializer,
    UserUpdateSerializer,
)
from apps.users.services import UserManagementService
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_bool_query_param, parse_int_query_param
from core.responses import created_response, list_response, no_content_response, success_response

USER_REFERENCE_PERMISSION_CODES = [
    'user.create',
    'user.update',
    'user.role.assign',
    'user.permission.view',
    'user.permission.update',
    'user.view',
]


class UserListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取用户列表',
        description='获取当前角色在用户查看权限作用范围内的用户列表',
        parameters=[
            OpenApiParameter(name='is_active', type=bool, description='按激活状态筛选'),
            OpenApiParameter(name='department_id', type=int, description='按部门筛选'),
            OpenApiParameter(name='mentor_id', type=int, description='按导师筛选'),
            OpenApiParameter(name='search', type=str, description='搜索姓名或工号'),
        ],
        responses={
            200: UserSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        enforce('user.view', request, error_message='无权查看用户列表')
        queryset = list_users(
            is_active=parse_bool_query_param(request=request, name='is_active', default=None),
            department_id=parse_int_query_param(request=request, name='department_id', minimum=1),
            mentor_id=parse_int_query_param(request=request, name='mentor_id', minimum=1),
            search=request.query_params.get('search'),
        )
        queryset = scope_filter(
            'user.view',
            request,
            resource_model=User,
            base_queryset=queryset,
        )
        return list_response(UserSerializer(queryset, many=True).data)

    @extend_schema(
        summary='创建用户',
        description='创建新用户，不传角色时默认学员；传入 role_codes 时按最终角色集合保存',
        request=UserCreateSerializer,
        responses={
            201: UserSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def post(self, request):
        enforce('user.create', request, error_message='只有管理员可以创建用户')
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        if 'role_codes' in serializer.validated_data:
            enforce('user.role.assign', request, error_message='无权分配用户角色')
        user = UserManagementService(request).create_user(dict(serializer.validated_data))
        return created_response(UserSerializer(user).data)


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        user = get_user_by_id(pk)
        if not user:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='用户不存在',
            )
        return user

    @extend_schema(
        summary='获取用户详情',
        description='获取指定用户的详细信息（需在用户查看权限作用范围内）',
        responses={
            200: UserSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def get(self, request, pk):
        user = self.get_object(pk)
        enforce('user.view', request, resource=user, error_message='无权查看用户详情')
        return success_response(UserSerializer(user).data)

    @extend_schema(
        summary='更新用户信息',
        description='更新用户的基础信息和组织归属',
        request=UserUpdateSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def patch(self, request, pk):
        enforce('user.update', request, error_message='只有管理员可以更新用户信息')
        user = self.get_object(pk)
        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('role_codes') is not None:
            enforce('user.role.assign', request, error_message='无权分配用户角色')
        user = UserManagementService(request).update_user(user, dict(serializer.validated_data))
        return success_response(UserSerializer(user).data)

    @extend_schema(
        summary='删除用户',
        description='彻底删除离职（已停用）用户及其全部关联数据',
        responses={
            200: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='参数错误或用户状态不允许删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def delete(self, request, pk):
        enforce('user.delete', request, error_message='只有管理员可以删除用户')
        UserManagementService(request).delete_user(pk)
        return no_content_response()


class UserDeactivateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='停用用户',
        description='停用指定用户，用户将无法登录',
        responses={
            200: UserSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def post(self, request, pk):
        enforce('user.activate', request, error_message='只有管理员可以停用用户')
        user = self.service.deactivate_user(pk)
        return success_response(UserSerializer(user).data)


class UserActivateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='启用用户',
        description='启用已停用的用户，恢复登录能力',
        responses={
            200: UserSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def post(self, request, pk):
        enforce('user.activate', request, error_message='只有管理员可以启用用户')
        user = self.service.activate_user(pk)
        return success_response(UserSerializer(user).data)


class UserSelfAvatarView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='更新本人头像',
        description='更新当前登录用户的默认头像',
        request=AvatarUpdateSerializer,
        responses={
            200: UserInfoSerializer,
            400: OpenApiResponse(description='头像标识无效'),
            401: OpenApiResponse(description='未登录'),
        },
        tags=['用户管理'],
    )
    def patch(self, request):
        serializer = AvatarUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.service.update_avatar(request.user.id, serializer.validated_data['avatar_key'])
        return success_response(UserInfoSerializer(user).data)


class UserAvatarUpdateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='更新用户头像',
        description='管理员更新指定用户的默认头像',
        request=AvatarUpdateSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description='头像标识无效'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def patch(self, request, pk):
        enforce('user.avatar.update', request, error_message='只有管理员可以修改其他用户头像')
        serializer = AvatarUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.service.update_avatar(pk, serializer.validated_data['avatar_key'])
        return success_response(UserSerializer(user).data)


class UserAssignRolesView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='分配角色',
        description='为用户分配最终角色集合，学员角色可添加或移除',
        request=AssignRolesSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def post(self, request, pk):
        enforce('user.role.assign', request, error_message='无权分配用户角色')
        serializer = AssignRolesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.service.assign_roles(
            user_id=pk,
            role_codes=serializer.validated_data['role_codes'],
            assigned_by=request.user,
        )
        return success_response(UserSerializer(user).data)


class UserAssignMentorView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='指定导师',
        description='为学员指定导师，传入null解除绑定',
        request=AssignMentorSerializer,
        responses={
            200: UserSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def post(self, request, pk):
        enforce('user.update', request, error_message='只有管理员可以指定导师')
        serializer = AssignMentorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.service.assign_mentor(
            user_id=pk,
            mentor_id=serializer.validated_data.get('mentor_id'),
        )
        return success_response(UserSerializer(user).data)


class MentorsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取导师列表',
        description='获取所有具有导师角色的用户列表，用于指定导师',
        responses={
            200: MentorSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        enforce_any(
            USER_REFERENCE_PERMISSION_CODES,
            request,
            error_message='无权查看导师列表',
        )
        mentors = User.objects.filter(
            roles__code='MENTOR',
            is_active=True,
        ).distinct().order_by('username')
        return list_response(MentorSerializer(mentors, many=True).data)


class DepartmentsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取部门列表',
        description='获取所有可用的部门列表，用于创建和编辑用户',
        responses={
            200: DepartmentSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        enforce_any(
            USER_REFERENCE_PERMISSION_CODES,
            request,
            error_message='无权查看部门列表',
        )
        return list_response(DepartmentSerializer(Department.objects.order_by('code'), many=True).data)


class RolesListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取角色列表',
        description='获取所有可用的角色列表，用于分配角色',
        responses={
            200: RoleSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        enforce_any(
            USER_REFERENCE_PERMISSION_CODES,
            request,
            error_message='无权查看角色列表',
        )
        return list_response(RoleSerializer(Role.objects.order_by('code'), many=True).data)
