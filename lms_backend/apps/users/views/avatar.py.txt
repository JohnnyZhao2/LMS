from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.users.serializers import AvatarUpdateSerializer, UserDetailSerializer, UserInfoSerializer
from apps.users.services import UserManagementService
from core.base_view import BaseAPIView
from core.responses import success_response


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
            200: UserDetailSerializer,
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
        return success_response(UserDetailSerializer(user).data)
