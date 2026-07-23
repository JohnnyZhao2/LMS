"""
抽查记录视图
"""
from uuid import UUID

from django.db.models import Avg, Count, Q
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.authorization.engine import enforce, scope_filter
from apps.users.models import User
from core.base_view import BaseAPIView
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from core.query_params import parse_int_query_param

from .models import SpotCheck
from .serializers import (
    SpotCheckCreateSerializer,
    SpotCheckDetailSerializer,
    SpotCheckListSerializer,
    SpotCheckScoreSerializer,
    SpotCheckStudentSerializer,
    SpotCheckSubmitSerializer,
)
from .services import SpotCheckService


class SpotCheckListCreateView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    service_class = SpotCheckService

    @extend_schema(
        summary='获取抽查记录列表',
        parameters=[
            OpenApiParameter(name='student_id', type=int, description='按学员ID筛选'),
            OpenApiParameter(name='batch_id', type=str, description='按批次标识筛选'),
            OpenApiParameter(name='status', type=str, description='按状态筛选：PENDING/SUBMITTED/SCORED'),
            OpenApiParameter(name='topic', type=str, description='按抽查主题搜索'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: SpotCheckListSerializer(many=True)},
        tags=['抽查管理'],
    )
    def get(self, request):
        enforce('spot_check.view', request, error_message='无权查看抽查记录')
        student_id = parse_int_query_param(
            request=request,
            name='student_id',
            minimum=1,
        )
        batch_id = None
        raw_batch_id = (request.query_params.get('batch_id') or '').strip()
        if raw_batch_id:
            try:
                batch_id = UUID(raw_batch_id)
            except ValueError as exc:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='batch_id 格式无效',
                ) from exc
        status = (request.query_params.get('status') or '').strip().upper() or None
        if status and status not in {
            SpotCheck.STATUS_PENDING,
            SpotCheck.STATUS_SUBMITTED,
            SpotCheck.STATUS_SCORED,
        }:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='status 无效')
        topic = (request.query_params.get('topic') or '').strip()
        spot_checks = self.service.get_list(
            student_id=student_id,
            batch_id=batch_id,
            status=status,
            topic=topic,
            ordering='-created_at',
        )
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(spot_checks, request)
        serializer = SpotCheckListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)

    @extend_schema(
        summary='批量发起抽查',
        request=SpotCheckCreateSerializer,
        responses={201: SpotCheckDetailSerializer(many=True)},
        tags=['抽查管理'],
    )
    def post(self, request):
        serializer = SpotCheckCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        enforce('spot_check.create', request, error_message='无权创建抽查记录')
        created = self.service.batch_create(data=serializer.validated_data)
        response_serializer = SpotCheckDetailSerializer(created, many=True, context={'request': request})
        return Response(response_serializer.data, status=201)


class SpotCheckMineView(BaseAPIView):
    """学员自己的抽查列表。"""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    service_class = SpotCheckService

    @extend_schema(
        summary='获取我的抽查列表',
        parameters=[
            OpenApiParameter(name='status', type=str, description='状态筛选：PENDING/SUBMITTED/SCORED'),
            OpenApiParameter(name='page', type=int, description='页码'),
            OpenApiParameter(name='page_size', type=int, description='每页数量'),
        ],
        responses={200: SpotCheckListSerializer(many=True)},
        tags=['抽查管理'],
    )
    def get(self, request):
        status = (request.query_params.get('status') or '').strip().upper() or None
        if status and status not in {
            SpotCheck.STATUS_PENDING,
            SpotCheck.STATUS_SUBMITTED,
            SpotCheck.STATUS_SCORED,
        }:
            raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='status 无效')
        spot_checks = self.service.get_mine(ordering='-created_at', status=status)
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(spot_checks, request)
        serializer = SpotCheckListSerializer(page, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)


class SpotCheckStudentListView(BaseAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary='获取可查看抽查的学员列表',
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
        ).filter(roles__code='STUDENT').select_related('department').annotate(
            spot_check_count=Count('spot_checks_received', distinct=True),
            average_score=Avg(
                'spot_checks_received__items__score',
                filter=Q(spot_checks_received__status=SpotCheck.STATUS_SCORED),
            ),
        ).distinct()

        search = (request.query_params.get('search') or '').strip()
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) | Q(employee_id__icontains=search)
            )
        queryset = queryset.order_by('-spot_check_count', 'username', 'employee_id')
        serializer = SpotCheckStudentSerializer(queryset, many=True)
        return Response(serializer.data)


class SpotCheckDetailView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = SpotCheckService

    @extend_schema(summary='获取抽查记录详情', responses={200: SpotCheckDetailSerializer}, tags=['抽查管理'])
    def get(self, request, pk):
        spot_check = self.service.get_by_id(pk)
        serializer = SpotCheckDetailSerializer(spot_check, context={'request': request})
        return Response(serializer.data)

    @extend_schema(summary='删除抽查记录', tags=['抽查管理'])
    def delete(self, request, pk):
        self.service.delete(pk)
        return Response(None)


class SpotCheckSubmitView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = SpotCheckService

    @extend_schema(summary='学员提交抽查', request=SpotCheckSubmitSerializer, tags=['抽查管理'])
    def post(self, request, pk):
        serializer = SpotCheckSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        spot_check = self.service.submit(pk=pk, data=serializer.validated_data)
        response_serializer = SpotCheckDetailSerializer(spot_check, context={'request': request})
        return Response(response_serializer.data)


class SpotCheckScoreView(BaseAPIView):
    permission_classes = [IsAuthenticated]
    service_class = SpotCheckService

    @extend_schema(summary='导师评分', request=SpotCheckScoreSerializer, tags=['抽查管理'])
    def post(self, request, pk):
        serializer = SpotCheckScoreSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        spot_check = self.service.score(pk=pk, data=serializer.validated_data)
        response_serializer = SpotCheckDetailSerializer(spot_check, context={'request': request})
        return Response(response_serializer.data)
