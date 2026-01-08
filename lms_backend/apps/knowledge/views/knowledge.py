"""
Knowledge document management views.
Implements:
- Knowledge CRUD
- Knowledge stats
- Student knowledge list
- View count increment
"""
from django.db import models
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from rest_framework import serializers as drf_serializers
from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from apps.knowledge.models import Knowledge, ResourceLineType
from apps.knowledge.services import KnowledgeService
from apps.knowledge.serializers import (
    KnowledgeListSerializer,
    KnowledgeDetailSerializer,
    KnowledgeCreateSerializer,
    KnowledgeUpdateSerializer,
    KnowledgeStatsSerializer,
)
class ViewCountResponseSerializer(drf_serializers.Serializer):
    """Serializer for view count response."""
    view_count = drf_serializers.IntegerField()
class KnowledgeListCreateView(APIView):
    """
    Knowledge list and create endpoint.
    """
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    @extend_schema(
        summary='获取知识文档列表',
        description='''获取知识文档列表，支持条线类型、知识类型和系统标签筛选。
普通用户只能看到当前版本的知识，管理员默认也只看到当前版本。
**注意：** 保存即发布，所有显示的知识都是当前版本（is_current=True）。
''',
        parameters=[
            OpenApiParameter(name='knowledge_type', type=str, description='知识类型（EMERGENCY/OTHER）'),
            OpenApiParameter(name='line_type_id', type=int, description='条线类型ID'),
            OpenApiParameter(name='system_tag_id', type=int, description='系统标签ID'),
            OpenApiParameter(name='operation_tag_id', type=int, description='操作标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或内容'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: KnowledgeListSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        # 1. 获取查询参数
        filters = {
            'knowledge_type': request.query_params.get('knowledge_type'),
            'line_type_id': request.query_params.get('line_type_id'),
            'system_tag_id': request.query_params.get('system_tag_id'),
            'operation_tag_id': request.query_params.get('operation_tag_id'),
        }
        filters = {k: v for k, v in filters.items() if v}
        search = request.query_params.get('search')
        # 2. 调用 Service（管理端和学员端都只返回当前版本）
        knowledge_list = self.service.get_all_with_filters(
            filters=filters,
            search=search
        )
        # 3. 分页和序列化
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(knowledge_list, request)
        if page is not None:
            serializer = KnowledgeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = KnowledgeListSerializer(knowledge_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    @extend_schema(
        summary='创建知识文档',
        description='创建新的知识文档（仅管理员）',
        request=KnowledgeCreateSerializer,
        responses={
            201: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['知识管理']
    )
    def post(self, request):
        # 1. 权限检查
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以创建知识文档'
            )
        # 2. 反序列化输入
        serializer = KnowledgeCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        # 3. 调用 Service
        try:
            knowledge = self.service.create(
                data=serializer.validated_data,
                user=request.user
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        # 4. 序列化输出
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
class KnowledgeDetailView(APIView):
    """
    Knowledge detail, update, delete endpoint.
    """
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    @extend_schema(
        summary='获取知识文档详情',
        description='获取指定知识文档的详细信息',
        responses={
            200: KnowledgeDetailSerializer,
            403: OpenApiResponse(description='无权访问该知识文档'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def get(self, request, pk):
        # 1. 调用 Service
        try:
            knowledge = self.service.get_by_id(pk, user=request.user)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND if e.code == ErrorCodes.RESOURCE_NOT_FOUND else status.HTTP_403_FORBIDDEN
            )
        # 2. 序列化输出
        serializer = KnowledgeDetailSerializer(knowledge)
        return Response(serializer.data, status=status.HTTP_200_OK)
    @extend_schema(
        summary='更新知识文档',
        description='更新知识文档内容（仅管理员）',
        request=KnowledgeUpdateSerializer,
        responses={
            200: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def patch(self, request, pk):
        # 1. 权限检查
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以更新知识文档'
            )
        # 2. 反序列化输入
        serializer = KnowledgeUpdateSerializer(
            data=request.data, partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        # 3. 调用 Service
        try:
            knowledge = self.service.update(
                pk=pk,
                data=serializer.validated_data,
                user=request.user
            )
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        # 4. 序列化输出
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    @extend_schema(
        summary='删除知识文档',
        description='删除知识文档（仅管理员，被任务引用时禁止删除）',
        responses={
            204: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='知识文档被任务引用，无法删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def delete(self, request, pk):
        # 1. 权限检查
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以删除知识文档'
            )
        # 2. 调用 Service
        try:
            self.service.delete(pk)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message, 'details': e.details},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
class KnowledgeStatsView(APIView):
    """知识统计端点"""
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    @extend_schema(
        summary='获取知识统计',
        description='获取知识文档的统计数据',
        parameters=[
            OpenApiParameter(name='knowledge_type', type=str, description='知识类型（EMERGENCY/OTHER）'),
            OpenApiParameter(name='line_type_id', type=int, description='条线类型ID'),
            OpenApiParameter(name='system_tag_id', type=int, description='系统标签ID'),
            OpenApiParameter(name='operation_tag_id', type=int, description='操作标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或内容'),
        ],
        responses={200: KnowledgeStatsSerializer},
        tags=['知识管理']
    )
    def get(self, request):
        # 1. 获取查询参数
        filters = {
            'knowledge_type': request.query_params.get('knowledge_type'),
            'line_type_id': request.query_params.get('line_type_id'),
            'system_tag_id': request.query_params.get('system_tag_id'),
            'operation_tag_id': request.query_params.get('operation_tag_id'),
        }
        filters = {k: v for k, v in filters.items() if v}
        search = request.query_params.get('search')
        # 2. 调用 Service 获取知识列表（只返回当前版本）
        knowledge_list = self.service.get_all_with_filters(
            filters=filters,
            search=search
        )
        # 3. 计算统计信息
        from django.utils import timezone
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        stats = {
            'total': len(knowledge_list),
            'published': len(knowledge_list),  # 所有返回的都是当前版本
            'emergency': len([k for k in knowledge_list if k.knowledge_type == 'EMERGENCY']),
            'monthly_new': len([k for k in knowledge_list if k.created_at >= first_day_of_month]),
        }
        # 4. 序列化输出
        serializer = KnowledgeStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)
class StudentKnowledgeListView(APIView):
    """学员知识列表端点 - 只返回当前版本的知识"""
    permission_classes = [IsAuthenticated]
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    @extend_schema(
        summary='获取学员知识列表',
        description='获取已发布的知识文档列表。此接口专为学员端设计。',
        parameters=[
            OpenApiParameter(name='knowledge_type', type=str, description='知识类型（EMERGENCY/OTHER）'),
            OpenApiParameter(name='line_type_id', type=int, description='条线类型ID'),
            OpenApiParameter(name='system_tag_id', type=int, description='系统标签ID'),
            OpenApiParameter(name='operation_tag_id', type=int, description='操作标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或内容'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: KnowledgeListSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        # 1. 获取查询参数
        filters = {
            'knowledge_type': request.query_params.get('knowledge_type'),
            'line_type_id': request.query_params.get('line_type_id'),
            'system_tag_id': request.query_params.get('system_tag_id'),
            'operation_tag_id': request.query_params.get('operation_tag_id'),
        }
        filters = {k: v for k, v in filters.items() if v}
        search = request.query_params.get('search')
        # 2. 调用 Service（学员只能看到当前版本的知识）
        knowledge_list = self.service.get_all_with_filters(
            filters=filters,
            search=search
        )
        # 3. 分页和序列化
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(knowledge_list, request)
        if page is not None:
            serializer = KnowledgeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        serializer = KnowledgeListSerializer(knowledge_list, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
class KnowledgeIncrementViewCountView(APIView):
    """Increment knowledge view count endpoint."""
    permission_classes = [IsAuthenticated]
    serializer_class = ViewCountResponseSerializer
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.service = KnowledgeService()
    @extend_schema(
        summary='增加知识阅读次数',
        description='记录知识文档被阅读',
        responses={
            200: ViewCountResponseSerializer,
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def post(self, request, pk):
        # 1. 权限检查（先获取知识文档）
        try:
            knowledge = self.service.get_by_id(pk, user=request.user)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND if e.code == ErrorCodes.RESOURCE_NOT_FOUND else status.HTTP_403_FORBIDDEN
            )
        # 2. 调用 Service
        try:
            view_count = self.service.increment_view_count(pk)
        except BusinessError as e:
            return Response(
                {'code': e.code, 'message': e.message},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({'view_count': view_count}, status=status.HTTP_200_OK)
