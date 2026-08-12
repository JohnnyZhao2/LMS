"""Authorization management views."""

from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.users.selectors import get_user_or_404
from core.base_view import BaseAPIView
from core.responses import list_response, success_response

from .engine import get_engine
from .selectors import list_permissions
from .serializers import (
    GroupPermissionSerializer,
    PermissionCodesSerializer,
    PermissionSerializer,
    UserPermissionSerializer,
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
        get_engine(request).require_permission('users.view_user_permission', error_message='无权查看权限目录')
        serializer = PermissionSerializer(list_permissions(), many=True)
        return list_response(serializer.data)


class UserPermissionView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取用户权限（角色基础 + 个人额外）',
        responses={
            200: UserPermissionSerializer,
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户授权'],
    )
    def get(self, request, user_id: int):
        target = get_user_or_404(user_id)
        get_engine(request).enforce(
            'users.view_user_permission',
            resource=target,
            error_message='无权查看该用户权限',
        )
        return success_response(self.service.user_permission_payload(user=target))

    @extend_schema(
        summary='替换用户权限（基础不可关，多出的写入个人额外）',
        request=PermissionCodesSerializer,
        responses={
            200: UserPermissionSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户授权'],
    )
    def put(self, request, user_id: int):
        target = get_user_or_404(user_id)
        get_engine(request).enforce(
            'users.change_user_permission',
            resource=target,
            error_message='无权更新该用户权限',
        )
        serializer = PermissionCodesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.service.replace_user_permissions(
            user=target,
            permission_codes=serializer.validated_data['permission_codes'],
        )
        return success_response(self.service.user_permission_payload(user=target))


class GroupPermissionView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取角色基础权限',
        responses={200: GroupPermissionSerializer, 403: OpenApiResponse(description='无权限')},
        tags=['用户授权'],
    )
    def get(self, request, role_code: str):
        return success_response({
            'role_code': role_code,
            'permission_codes': self.service.list_group_permission_codes(role_code=role_code),
        })

    @extend_schema(
        summary='替换角色基础权限',
        request=PermissionCodesSerializer,
        responses={
            200: GroupPermissionSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户授权'],
    )
    def put(self, request, role_code: str):
        serializer = PermissionCodesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        permission_codes = self.service.replace_group_permissions(
            role_code=role_code,
            permission_codes=serializer.validated_data['permission_codes'],
        )
        return success_response({
            'role_code': role_code,
            'permission_codes': permission_codes,
        })
