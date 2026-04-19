from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.engine import enforce_any
from apps.users.models import Department, Role, User
from apps.users.serializers import DepartmentSerializer, MentorSerializer, RoleSerializer
from core.responses import list_response

from .constants import USER_REFERENCE_PERMISSION_CODES


class MentorsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取导师列表',
        description='获取所有具有导师角色的用户列表，用于指定导师',
        responses={
            200: MentorSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        enforce_any(
            USER_REFERENCE_PERMISSION_CODES,
            request,
            error_message='无权查看导师列表',
        )
        mentors = User.objects.filter(
            roles__code='MENTOR',
            is_active=True,
        ).distinct().order_by('username')
        return list_response(MentorSerializer(mentors, many=True).data)


class DepartmentsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取部门列表',
        description='获取所有可用的部门列表，用于创建和编辑用户',
        responses={
            200: DepartmentSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        enforce_any(
            USER_REFERENCE_PERMISSION_CODES,
            request,
            error_message='无权查看部门列表',
        )
        return list_response(DepartmentSerializer(Department.objects.order_by('code'), many=True).data)


class RolesListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取角色列表',
        description='获取所有可用的角色列表，用于分配角色',
        responses={
            200: RoleSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        enforce_any(
            USER_REFERENCE_PERMISSION_CODES,
            request,
            error_message='无权查看角色列表',
        )
        roles = Role.objects.exclude(code='STUDENT').order_by('code')
        return list_response(RoleSerializer(roles, many=True).data)
