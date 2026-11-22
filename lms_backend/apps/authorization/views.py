"""Authorization management views."""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from core.base_view import BaseAPIView
from core.responses import created_response, list_response, no_content_response, success_response

from .engine import get_engine
from .selectors import list_permissions
from .serializers import (
    PermissionSerializer,
    RoleCreateSerializer,
    RoleItemSerializer,
    RoleUpdateSerializer,
)
from .services import AuthorizationService


class PermissionCatalogView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取权限目录',
        responses={
            200: PermissionSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户授权'],
    )
    def get(self, request):
        get_engine(request).require_permission('users.assign_user_role', error_message='无权查看权限目录')
        serializer = PermissionSerializer(list_permissions(), many=True)
        return list_response(serializer.data)


class RoleListCreateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取角色列表',
        responses={
            200: RoleItemSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户授权'],
    )
    def get(self, request):
        serializer = RoleItemSerializer(self.service.list_roles(), many=True)
        return list_response(serializer.data)

    @extend_schema(
        summary='新建自定义角色',
        request=RoleCreateSerializer,
        responses={
            201: RoleItemSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户授权'],
    )
    def post(self, request):
        serializer = RoleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role_data = self.service.create_role(
            name=serializer.validated_data['name'],
            data_scope=serializer.validated_data['data_scope'],
            department_ids=serializer.validated_data['department_ids'],
            permission_codes=serializer.validated_data['permission_codes'],
        )
        return created_response(role_data)


class RoleDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='更新角色配置',
        request=RoleUpdateSerializer,
        responses={
            200: RoleItemSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='角色不存在'),
        },
        tags=['用户授权'],
    )
    def patch(self, request, role_code: str):
        serializer = RoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        role_data = self.service.update_role(
            role_code=role_code,
            **serializer.validated_data,
        )
        return success_response(role_data)

    @extend_schema(
        summary='删除自定义角色',
        responses={
            200: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='内置角色不可删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='角色不存在'),
        },
        tags=['用户授权'],
    )
    def delete(self, request, role_code: str):
        self.service.delete_role(role_code=role_code)
        return no_content_response()
