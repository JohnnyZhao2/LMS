from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce
from apps.users.serializers import AssignMentorSerializer, AssignRolesSerializer, UserDetailSerializer
from apps.users.services import UserManagementService
from core.base_view import BaseAPIView
from core.responses import success_response


class UserAssignRolesView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='分配角色',
        description='为用户分配角色，学员角色自动保留',
        request=AssignRolesSerializer,
        responses={
            200: UserDetailSerializer,
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
        return success_response(UserDetailSerializer(user).data)


class UserAssignMentorView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = UserManagementService

    @extend_schema(
        summary='指定导师',
        description='为学员指定导师，传入null解除绑定',
        request=AssignMentorSerializer,
        responses={
            200: UserDetailSerializer,
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
        return success_response(UserDetailSerializer(user).data)
