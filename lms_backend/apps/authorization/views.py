"""Authorization management views."""

from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from core.base_view import BaseAPIView
from core.responses import list_response, success_response

from .engine import enforce, enforce_any
from .serializers import PermissionSerializer, UserPermissionsSerializer
from .services import AuthorizationService


USER_PERMISSION_ACCESS_CODES = ('user.permission.view', 'user.permission.update')


class PermissionCatalogView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取权限目录',
        parameters=[
            OpenApiParameter(name='module', type=str),
        ],
        responses={200: PermissionSerializer(many=True)},
        tags=['授权管理'],
    )
    def get(self, request):
        enforce_any(USER_PERMISSION_ACCESS_CODES, request, error_message='无权查看权限目录')
        module = request.query_params.get('module')
        permissions = self.service.list_permission_catalog(module=module)
        return list_response(PermissionSerializer(permissions, many=True).data)


class UserPermissionsView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='获取用户权限',
        responses={200: UserPermissionsSerializer},
        tags=['授权管理'],
    )
    def get(self, request, user_id: int):
        enforce('user.permission.view', request, error_message='无权查看用户权限')
        codes = self.service.get_user_permission_codes(user_id)
        return success_response({'permission_codes': codes})


class UserPermissionDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = AuthorizationService

    @extend_schema(
        summary='授予用户权限',
        request=None,
        responses={200: UserPermissionsSerializer, 403: OpenApiResponse(description='无权限')},
        tags=['授权管理'],
    )
    def put(self, request, user_id: int, permission_code: str):
        enforce('user.permission.update', request, error_message='无权更新用户权限')
        codes = self.service.grant_user_permission(
            user_id=user_id,
            permission_code=permission_code,
        )
        return success_response({'permission_codes': codes})

    @extend_schema(
        summary='撤销用户权限',
        responses={200: UserPermissionsSerializer, 403: OpenApiResponse(description='无权限')},
        tags=['授权管理'],
    )
    def delete(self, request, user_id: int, permission_code: str):
        enforce('user.permission.update', request, error_message='无权更新用户权限')
        codes = self.service.revoke_user_permission(
            user_id=user_id,
            permission_code=permission_code,
        )
        return success_response({'permission_codes': codes})
