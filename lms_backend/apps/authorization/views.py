"""Authorization management views."""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from core.base_view import BaseAPIView
from core.responses import list_response, success_response

from .engine import enforce, enforce_any
from .serializers import (
    GroupPermissionSerializer,
    PermissionSerializer,
    UserPermissionReplaceSerializer,
    UserPermissionSerializer,
)
from .services import AuthorizationService


USER_PERMISSION_ACCESS_CODES = (
    'users.view_user_permission',
    'users.change_user_permission',
)
PERMISSION_CATALOG_ACCESS_CODES = (
    *USER_PERMISSION_ACCESS_CODES,
    'users.assign_user_role',
)


class PermissionCatalogView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取权限目录',
        parameters=[
            OpenApiParameter(name='module', type=str, description='按模块筛选（可选）'),
        ],
        responses={
            200: PermissionSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def get(self, request):
        enforce_any(PERMISSION_CATALOG_ACCESS_CODES, request, error_message='无权查看权限目录')
        module = request.query_params.get('module')
        permissions = self.service.list_permission_catalog(module=module)
        serializer = PermissionSerializer(permissions, many=True)
        return list_response(serializer.data)


class UserPermissionView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取用户最终权限',
        responses={
            200: UserPermissionSerializer,
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def get(self, request, user_id: int):
        enforce_any(USER_PERMISSION_ACCESS_CODES, request, error_message='无权查看用户权限')
        permission_codes = self.service.list_user_permission_codes(user_id=user_id)
        return success_response({
            'user_id': user_id,
            'permission_codes': permission_codes,
            'inherited_permission_codes': self.service.list_user_group_permission_codes(user_id=user_id),
        })

    @extend_schema(
        summary='替换用户最终权限',
        request=UserPermissionReplaceSerializer,
        responses={
            200: UserPermissionSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def put(self, request, user_id: int):
        enforce('users.change_user_permission', request, error_message='无权更新用户权限')
        serializer = UserPermissionReplaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.service.replace_user_permissions(
            user_id=user_id,
            permission_codes=serializer.validated_data['permission_codes'],
        )
        permission_codes = self.service.list_user_permission_codes(user_id=user_id)
        return success_response({
            'user_id': user_id,
            'permission_codes': permission_codes,
            'inherited_permission_codes': self.service.list_user_group_permission_codes(user_id=user_id),
        })


class GroupPermissionView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取角色默认权限',
        responses={200: GroupPermissionSerializer, 403: OpenApiResponse(description='无权限')},
        tags=['授权管理'],
    )
    def get(self, request, role_code: str):
        enforce_any(USER_PERMISSION_ACCESS_CODES, request, error_message='无权查看角色权限')
        return success_response({
            'role_code': role_code,
            'permission_codes': self.service.list_group_permission_codes(role_code=role_code),
        })

    @extend_schema(
        summary='替换角色默认权限',
        request=UserPermissionReplaceSerializer,
        responses={
            200: GroupPermissionSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def put(self, request, role_code: str):
        enforce('users.change_user_permission', request, error_message='无权更新角色权限')
        serializer = UserPermissionReplaceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.service.replace_group_permissions(
            role_code=role_code,
            permission_codes=serializer.validated_data['permission_codes'],
        )
        return success_response({
            'role_code': role_code,
            'permission_codes': self.service.list_group_permission_codes(role_code=role_code),
        })
