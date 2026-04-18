from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.engine import enforce, scope_filter
from apps.users.models import User
from apps.users.selectors import get_user_by_id, list_users
from apps.users.serializers import (
    UserCreateSerializer,
    UserDetailSerializer,
    UserListSerializer,
    UserUpdateSerializer,
)
from apps.users.services import UserManagementService
from core.exceptions import BusinessError, ErrorCodes
from core.query_params import parse_bool_query_param, parse_int_query_param
from core.responses import created_response, list_response, no_content_response, success_response


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
            200: UserListSerializer(many=True),
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
        serializer = UserListSerializer(queryset, many=True)
        return list_response(serializer.data)

    @extend_schema(
        summary='创建用户',
        description='创建新用户，按角色规则自动处理学员角色（默认保留学员，室经理/团队经理不保留）',
        request=UserCreateSerializer,
        responses={
            201: UserDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def post(self, request):
        enforce('user.create', request, error_message='只有管理员可以创建用户')
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        if serializer.validated_data.get('role_codes'):
            enforce('user.authorize', request, error_message='只有管理员可以分配角色')
        user = serializer.save()
        return created_response(UserDetailSerializer(user).data)


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
            200: UserDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def get(self, request, pk):
        user = self.get_object(pk)
        enforce('user.view', request, error_message='无权查看用户详情')
        if not scope_filter(
            'user.view',
            request,
            resource_model=User,
            base_queryset=User.objects.filter(pk=user.pk),
        ).exists():
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权查看该用户详情',
            )
        return success_response(UserDetailSerializer(user).data)

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
            enforce('user.authorize', request, error_message='只有管理员可以分配角色')
        user = serializer.save()
        return success_response(UserDetailSerializer(user).data)

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
