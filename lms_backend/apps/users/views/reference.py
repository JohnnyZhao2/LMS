from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.authorization.engine import get_engine
from django.contrib.auth.models import Group

from apps.users.models import Department, User
from apps.users.serializers import DepartmentOptionSerializer, MentorSerializer, RoleSerializer
from core.responses import list_response

from .constants import USER_REFERENCE_PERMISSION_CODES


def _get_scoped_mentor_queryset(request, *, require_mentor_role: bool):
    engine = get_engine(request)
    engine.enforce_any(
        USER_REFERENCE_PERMISSION_CODES,
        error_message='无权查看导师列表',
    )
    mentors = User.objects.filter(
        is_active=True,
        is_superuser=False,
    )
    if require_mentor_role:
        mentors = mentors.filter(groups__name='MENTOR').distinct()
    if not engine.user.is_superuser:
        write_codes = [
            code for code in ('users.add_user', 'users.change_user')
            if engine.has_permission(code)
        ]
        scope_codes = write_codes or [
            code for code in USER_REFERENCE_PERMISSION_CODES
            if engine.has_permission(code)
        ]
        scopes = [engine.get_permission_scope(code) for code in scope_codes]
        if not any(scope == 'ALL' for scope, _ in scopes):
            allowed_dept_ids = set().union(*(dept_ids for _, dept_ids in scopes))
            if allowed_dept_ids:
                mentors = mentors.filter(department_id__in=allowed_dept_ids)
            else:
                mentors = mentors.filter(pk=engine.user.pk)
    return mentors.order_by('username')


class MentorsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取导师列表',
        description='获取所有具有导师角色（MENTOR）的在职员工，用于按导师筛选学员',
        responses={
            200: MentorSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        mentors = _get_scoped_mentor_queryset(request, require_mentor_role=True)
        return list_response(MentorSerializer(mentors, many=True).data)


class MentorCandidatesListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取可指定为带教导师的在职员工列表',
        description='获取当前权限范围内可指定为带教导师的所有在职员工，不限制 MENTOR 角色',
        responses={
            200: MentorSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        candidates = _get_scoped_mentor_queryset(request, require_mentor_role=False)
        return list_response(MentorSerializer(candidates, many=True).data)


class DepartmentsListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取部门列表',
        description='获取所有可用的部门列表，用于创建和编辑用户',
        responses={
            200: DepartmentOptionSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        get_engine(request).enforce_any(USER_REFERENCE_PERMISSION_CODES,
            error_message='无权查看部门列表',
        )
        departments = Department.objects.select_related('manager').order_by('code')
        return list_response(DepartmentOptionSerializer(departments, many=True).data)


class RolesListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取角色列表',
        description='获取所有启用中的角色列表，用于分配角色',
        responses={
            200: RoleSerializer(many=True),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['用户管理'],
    )
    def get(self, request):
        get_engine(request).enforce_any(USER_REFERENCE_PERMISSION_CODES,
            error_message='无权查看角色列表',
        )
        roles = Group.objects.select_related('profile').filter(profile__is_active=True).order_by('-profile__is_builtin', 'id')
        return list_response(RoleSerializer(roles, many=True).data)
