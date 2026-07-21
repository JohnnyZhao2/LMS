from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.users.serializers import UserDetailSerializer
from apps.users.services import UserManagementService
from core.base_view import BaseAPIView
from core.responses import success_response


class UserDeactivateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='停用用户',
        description='停用指定用户，用户将无法登录',
        responses={
            200: UserDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def post(self, request, pk):
        enforce('user.activate', request, error_message='只有管理员可以停用用户')
        user = self.service.deactivate_user(pk)
        return success_response(UserDetailSerializer(user).data)


class UserActivateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='启用用户',
        description='启用已停用的用户，恢复登录能力',
        responses={
            200: UserDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='用户不存在'),
        },
        tags=['用户管理'],
    )
    def post(self, request, pk):
        enforce('user.activate', request, error_message='只有管理员可以启用用户')
        user = self.service.activate_user(pk)
        return success_response(UserDetailSerializer(user).data)
