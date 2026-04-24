"""Authorization management views."""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework import serializers

from core.base_view import BaseAPIView
from core.responses import created_response, list_response, success_response

from .engine import enforce, enforce_any
from .serializers import (
    PermissionSerializer,
    RolePermissionSerializer,
    RolePermissionTemplateSerializer,
    UserPermissionOverrideCreateSerializer,
    UserPermissionOverrideSerializer,
    UserScopeGroupOverrideCreateSerializer,
    UserScopeGroupOverrideSerializer,
)
from .services import AuthorizationService


PERMISSION_CATALOG_VIEW_CHOICES = {'role_template', 'user_authorization'}
ROLE_PERMISSION_TEMPLATE_ACCESS_CODES = (
    'role_permission_template.view',
    'role_permission_template.update',
)
USER_PERMISSION_ACCESS_CODES = (
    'user.permission.view',
    'user.permission.update',
)
PERMISSION_CATALOG_ACCESS_CODES = (
    *ROLE_PERMISSION_TEMPLATE_ACCESS_CODES,
    *USER_PERMISSION_ACCESS_CODES,
    'user.role.assign',
)


class PermissionCatalogView(BaseAPIView):
    """Permission catalog management."""

    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取权限目录',
        parameters=[
            OpenApiParameter(name='module', type=str, description='按模块筛选（可选）'),
            OpenApiParameter(
                name='view',
                type=str,
                description='按消费视图筛选（可选）：role_template 或 user_authorization',
            ),
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
        catalog_view = request.query_params.get('view') or None
        if catalog_view and catalog_view not in PERMISSION_CATALOG_VIEW_CHOICES:
            raise serializers.ValidationError({'view': '无效的权限目录视图类型'})
        permissions = self.service.list_permission_catalog(module=module, catalog_view=catalog_view)
        serializer = PermissionSerializer(permissions, many=True)
        return list_response(serializer.data)


class RolePermissionView(BaseAPIView):
    """Role baseline permission management."""

    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取角色权限模板',
        responses={
            200: RolePermissionTemplateSerializer,
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def get(self, request, role_code: str):
        enforce_any(
            ROLE_PERMISSION_TEMPLATE_ACCESS_CODES,
            request,
            error_message='无权查看角色权限模板',
        )

        permission_codes = self.service.get_role_permission_codes(role_code)
        return success_response(
            {
                'role_code': role_code,
                'permission_codes': permission_codes,
                'default_scope_types': self.service.get_role_default_scope_types(role_code),
                'scope_groups': self.service.get_role_scope_groups(role_code),
            }
        )

    @extend_schema(
        summary='替换角色权限模板',
        request=RolePermissionSerializer,
        responses={
            200: RolePermissionTemplateSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def put(self, request, role_code: str):
        enforce('role_permission_template.update', request, error_message='无权配置角色权限模板')

        serializer = RolePermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        requested_role_code = serializer.validated_data['role_code']
        if requested_role_code != role_code:
            raise serializers.ValidationError({'role_code': '路径角色与请求体角色不一致'})

        permission_codes = self.service.replace_role_permissions(
            role_code=role_code,
            permission_codes=serializer.validated_data['permission_codes'],
        )
        return success_response(
            {
                'role_code': role_code,
                'permission_codes': permission_codes,
                'default_scope_types': self.service.get_role_default_scope_types(role_code),
                'scope_groups': self.service.get_role_scope_groups(role_code),
            }
        )


class UserPermissionOverrideListCreateView(BaseAPIView):
    """User override management."""

    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取用户权限覆盖规则',
        responses={
            200: UserPermissionOverrideSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def get(self, request, user_id: int):
        enforce_any(
            USER_PERMISSION_ACCESS_CODES,
            request,
            error_message='无权查看用户权限覆盖',
        )

        overrides = self.service.list_user_permission_overrides(
            user_id=user_id,
        )
        serializer = UserPermissionOverrideSerializer(overrides, many=True)
        return list_response(serializer.data)

    @extend_schema(
        summary='创建用户权限覆盖规则',
        request=UserPermissionOverrideCreateSerializer,
        responses={
            201: UserPermissionOverrideSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def post(self, request, user_id: int):
        enforce('user.permission.update', request, error_message='无权创建用户权限覆盖')

        serializer = UserPermissionOverrideCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        override = self.service.create_user_permission_override(
            user_id=user_id,
            permission_code=serializer.validated_data['permission_code'],
            effect=serializer.validated_data['effect'],
            applies_to_role=serializer.validated_data.get('applies_to_role'),
            reason=serializer.validated_data.get('reason', ''),
            expires_at=serializer.validated_data.get('expires_at'),
        )
        response_serializer = UserPermissionOverrideSerializer(override)
        return created_response(response_serializer.data)


class UserPermissionOverrideDeleteView(BaseAPIView):
    """Delete an override."""

    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='删除用户权限覆盖规则',
        responses={
            200: UserPermissionOverrideSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='规则不存在'),
        },
        tags=['授权管理'],
    )
    def delete(self, request, user_id: int, override_id: int):
        enforce('user.permission.update', request, error_message='无权删除用户权限覆盖')
        override = self.service.delete_user_permission_override(
            user_id=user_id,
            override_id=override_id,
        )
        response_serializer = UserPermissionOverrideSerializer(override)
        return success_response(response_serializer.data)


class UserScopeGroupOverrideListCreateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取用户范围组覆盖规则',
        responses={
            200: UserScopeGroupOverrideSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def get(self, request, user_id: int):
        enforce_any(
            USER_PERMISSION_ACCESS_CODES,
            request,
            error_message='无权查看用户范围组覆盖',
        )
        overrides = self.service.list_user_scope_group_overrides(
            user_id=user_id,
        )
        serializer = UserScopeGroupOverrideSerializer(overrides, many=True)
        return list_response(serializer.data)

    @extend_schema(
        summary='创建用户范围组覆盖规则',
        request=UserScopeGroupOverrideCreateSerializer,
        responses={
            201: UserScopeGroupOverrideSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def post(self, request, user_id: int):
        enforce('user.permission.update', request, error_message='无权创建用户范围组覆盖')
        serializer = UserScopeGroupOverrideCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        override = self.service.create_user_scope_group_override(
            user_id=user_id,
            scope_group_key=serializer.validated_data['scope_group_key'],
            effect=serializer.validated_data['effect'],
            applies_to_role=serializer.validated_data.get('applies_to_role'),
            scope_type=serializer.validated_data['scope_type'],
            scope_user_ids=serializer.validated_data.get('scope_user_ids') or [],
            reason=serializer.validated_data.get('reason', ''),
            expires_at=serializer.validated_data.get('expires_at'),
        )
        response_serializer = UserScopeGroupOverrideSerializer(override)
        return created_response(response_serializer.data)


class UserScopeGroupOverrideDeleteView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='删除用户范围组覆盖规则',
        responses={
            200: UserScopeGroupOverrideSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='规则不存在'),
        },
        tags=['授权管理'],
    )
    def delete(self, request, user_id: int, override_id: int):
        enforce('user.permission.update', request, error_message='无权删除用户范围组覆盖')
        override = self.service.delete_user_scope_group_override(
            user_id=user_id,
            override_id=override_id,
        )
        response_serializer = UserScopeGroupOverrideSerializer(override)
        return success_response(response_serializer.data)
