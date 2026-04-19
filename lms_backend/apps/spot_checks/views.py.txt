"""
抽查记录视图
只处理 HTTP 请求/响应，所有业务逻辑在 Service 层。
Properties: 35, 36
"""
from django.db.models import Q
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated

from apps.authorization.engine import enforce, scope_filter
from apps.users.models import User
from core.base_view import BaseAPIView
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param
from core.responses import (
    created_response,
    list_response,
    no_content_response,
    success_response,
)

from .serializers import (
    SpotCheckCreateSerializer,
    SpotCheckDetailSerializer,
    SpotCheckListSerializer,
    SpotCheckStudentSerializer,
    SpotCheckUpdateSerializer,
)
from .services import SpotCheckService


class SpotCheckListCreateView(BaseAPIView):
    """
    抽查记录列表和创建端点
    Properties: 35, 36
    """

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    service_class = SpotCheckService

    @extend_schema(
        summary='获取抽查记录列表',
        description='获取所辖范围内的抽查记录列表，按创建时间倒序排列',
        parameters=[
            OpenApiParameter(name='student_id', type=int, description='按学员ID筛选'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: SpotCheckListSerializer(many=True)},
        tags=['抽查管理'],
    )
    def get(self, request):
        """获取抽查记录列表。"""
        enforce('spot_check.view', request, error_message='无权查看抽查记录')
        student_id = parse_int_query_param(
            request=request,
            name='student_id',
            minimum=1,
        )

        spot_checks = self.service.get_list(
            student_id=student_id,
            ordering='-created_at',
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(spot_checks, request)
        serializer = SpotCheckListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='创建抽查记录',
        description='创建新的抽查记录（导师只能为名下学员创建，室经理只能为本室学员创建）',
        request=SpotCheckCreateSerializer,
        responses={
            201: SpotCheckDetailSerializer,
            400: OpenApiResponse(description='参数错误或学员不在权限范围内'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['抽查管理'],
    )
    def post(self, request):
        """创建抽查记录。"""
        serializer = SpotCheckCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enforce(
            'spot_check.create',
            request,
            context={'student': serializer.validated_data.get('student')},
            error_message='无权创建抽查记录',
        )

        spot_check = self.service.create(data=serializer.validated_data)

        response_serializer = SpotCheckDetailSerializer(spot_check, context={'request': request})
        return created_response(response_serializer.data)


class SpotCheckStudentListView(BaseAPIView):
    """抽查学员筛选列表。"""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取可查看抽查的学员列表',
        description='返回当前角色在抽查查看权限范围内的全部学员（不要求已有抽查记录），可按姓名或工号搜索',
        parameters=[
            OpenApiParameter(name='search', type=str, description='按学员姓名或工号搜索'),
        ],
        responses={200: SpotCheckStudentSerializer(many=True)},
        tags=['抽查管理'],
    )
    def get(self, request):
        enforce('spot_check.view', request, error_message='无权查看抽查学员列表')

        queryset = scope_filter(
            'spot_check.view',
            request,
            resource_model=User,
        ).filter(roles__code='STUDENT').select_related('department').distinct()

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | Q(employee_id__icontains=search)
            )

        queryset = queryset.order_by('username', 'employee_id')
        serializer = SpotCheckStudentSerializer(queryset, many=True)
        return list_response(serializer.data)


class SpotCheckDetailView(BaseAPIView):
    """抽查记录详情、更新、删除端点。"""

    permission_classes = [IsAuthenticated]
    service_class = SpotCheckService

    @extend_schema(
        summary='获取抽查记录详情',
        description='获取指定抽查记录的详细信息',
        responses={
            200: SpotCheckDetailSerializer,
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='抽查记录不存在'),
        },
        tags=['抽查管理'],
    )
    def get(self, request, pk):
        """获取抽查记录详情。"""
        spot_check = self.service.get_by_id(pk)
        serializer = SpotCheckDetailSerializer(spot_check, context={'request': request})
        return success_response(serializer.data)

    @extend_schema(
        summary='更新抽查记录',
        description='更新抽查记录内容（只能更新自己创建的记录）',
        request=SpotCheckUpdateSerializer,
        responses={
            200: SpotCheckDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='抽查记录不存在'),
        },
        tags=['抽查管理'],
    )
    def patch(self, request, pk):
        """更新抽查记录。"""
        serializer = SpotCheckUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        spot_check = self.service.update(pk=pk, data=serializer.validated_data)

        response_serializer = SpotCheckDetailSerializer(spot_check, context={'request': request})
        return success_response(response_serializer.data)

    @extend_schema(
        summary='删除抽查记录',
        description='删除抽查记录（只能删除自己创建的记录）',
        responses={
            200: OpenApiResponse(description='删除成功'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='抽查记录不存在'),
        },
        tags=['抽查管理'],
    )
    def delete(self, request, pk):
        """删除抽查记录。"""
        self.service.delete(pk)
        return no_content_response()
