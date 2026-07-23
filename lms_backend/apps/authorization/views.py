"""Authorization management views."""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers

from core.base_view import BaseAPIView

from .engine import enforce, enforce_any
from .serializers import (
    PermissionSerializer,
    RoleTemplateSerializer,
    UserAuthorizationSerializer,
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
        return Response(serializer.data)


class RoleTemplateView(BaseAPIView):
    """角色模板完整状态管理。"""

    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取角色模板',
        responses={
            200: RoleTemplateSerializer,
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
        return Response(self.service.get_role_template(role_code))

    @extend_schema(
        summary='替换角色模板',
        request=RoleTemplateSerializer,
        responses={
            200: RoleTemplateSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def put(self, request, role_code: str):
        enforce('role_permission_template.update', request, error_message='无权配置角色权限模板')
        serializer = RoleTemplateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        requested_role_code = serializer.validated_data['role_code']
        if requested_role_code != role_code:
            raise serializers.ValidationError({'role_code': '路径角色与请求体角色不一致'})
        result = self.service.replace_role_template(
            role_code=role_code,
            permission_codes=serializer.validated_data['permission_codes'],
            scopes=serializer.validated_data.get('scopes') or [],
        )
        return Response(result)


class UserAuthorizationView(BaseAPIView):
    """用户最终授权管理。"""

    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取用户最终授权',
        responses={
            200: UserAuthorizationSerializer,
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def get(self, request, user_id: int):
        enforce_any(
            USER_PERMISSION_ACCESS_CODES,
            request,
            error_message='无权查看用户最终授权',
        )
        return Response(self.service.get_user_authorization(user_id))

    @extend_schema(
        summary='替换用户最终授权',
        request=UserAuthorizationSerializer,
        responses={
            200: UserAuthorizationSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def put(self, request, user_id: int):
        enforce('user.permission.update', request, error_message='无权配置用户最终授权')
        serializer = UserAuthorizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        current = self.service.get_user_authorization(user_id)
        requested_role = serializer.validated_data.get('role_code')
        if requested_role and requested_role != current['role_code']:
            raise serializers.ValidationError({'role_code': '不可通过授权接口变更用户角色'})
        result = self.service.replace_user_authorization(
            user_id=user_id,
            permission_codes=serializer.validated_data['permission_codes'],
            scopes=serializer.validated_data.get('scopes') or [],
        )
        return Response(result)


class UserAuthorizationResetView(BaseAPIView):
    """重置用户最终授权为角色模板。"""

    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='重置用户最终授权为角色模板',
        responses={
            200: UserAuthorizationSerializer,
            403: OpenApiResponse(description='无权限'),
        },
        tags=['授权管理'],
    )
    def post(self, request, user_id: int):
        enforce('user.permission.update', request, error_message='无权重置用户最终授权')
        result = self.service.reset_user_authorization(user_id=user_id)
        return Response(result)
