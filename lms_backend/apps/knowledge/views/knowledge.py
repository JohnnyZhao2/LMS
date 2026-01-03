"""
Knowledge document management views.

Implements:
- Knowledge CRUD
- Knowledge publish/unpublish
- Knowledge stats
- Student knowledge list
- View count increment

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
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
    
    Requirements: 4.1, 4.2, 4.3
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取知识文档列表',
        description='''获取知识文档列表，支持条线类型、知识类型和系统标签筛选。
        
普通用户只能看到已发布的知识，管理员可以看到所有（包括草稿）。

**filter_type 筛选说明（仅管理员）：**
- ALL: 全部（已发布+未发布，不含已发布版本的草稿副本）
- PUBLISHED_CLEAN: 已发布且无待发布修改
- REVISING: 修订中（已发布但有待发布的草稿修改）
- UNPUBLISHED: 未发布（从未发布过的新草稿）
''',
        parameters=[
            OpenApiParameter(name='knowledge_type', type=str, description='知识类型（EMERGENCY/OTHER）'),
            OpenApiParameter(name='line_type_id', type=int, description='条线类型ID'),
            OpenApiParameter(name='system_tag_id', type=int, description='系统标签ID'),
            OpenApiParameter(name='operation_tag_id', type=int, description='操作标签ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或内容'),
            OpenApiParameter(name='filter_type', type=str, description='筛选类型：ALL/PUBLISHED_CLEAN/REVISING/UNPUBLISHED（仅管理员可用）'),
            OpenApiParameter(name='status', type=str, description='[已废弃] 发布状态（DRAFT/PUBLISHED），建议使用 filter_type'),
            OpenApiParameter(name='include_drafts', type=bool, description='[已废弃] 是否包含草稿，建议使用 filter_type'),
            OpenApiParameter(name='page', type=int, description='页码（默认1）'),
            OpenApiParameter(name='page_size', type=int, description='每页数量（默认20）'),
        ],
        responses={200: KnowledgeListSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        queryset = Knowledge.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by', 'source_version'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        )
        
        # 权限过滤
        if not request.user.is_admin:
            queryset = queryset.filter(status='PUBLISHED', is_current=True)
        else:
            filter_type = request.query_params.get('filter_type', 'ALL')
            
            draft_of_published_ids = Knowledge.objects.filter(
                is_deleted=False,
                status='DRAFT',
                source_version__isnull=False
            ).values_list('id', flat=True)
            
            published_with_draft_ids = Knowledge.objects.filter(
                is_deleted=False,
                status='DRAFT',
                source_version__isnull=False
            ).values_list('source_version_id', flat=True)
            
            if filter_type == 'PUBLISHED_CLEAN':
                queryset = queryset.filter(
                    status='PUBLISHED',
                    is_current=True
                ).exclude(id__in=published_with_draft_ids)
            elif filter_type == 'REVISING':
                queryset = queryset.filter(
                    status='PUBLISHED',
                    is_current=True,
                    id__in=published_with_draft_ids
                )
            elif filter_type == 'UNPUBLISHED':
                queryset = queryset.filter(
                    status='DRAFT',
                    source_version__isnull=True
                )
            else:  # ALL
                queryset = queryset.filter(
                    models.Q(status='PUBLISHED', is_current=True) |
                    models.Q(status='DRAFT', source_version__isnull=True)
                )
            
            status_param = request.query_params.get('status')
            if status_param and filter_type == 'ALL':
                if status_param == 'DRAFT':
                    queryset = queryset.filter(status='DRAFT')
                elif status_param == 'PUBLISHED':
                    queryset = queryset.filter(status='PUBLISHED', is_current=True)
        
        # Apply filters
        knowledge_type = request.query_params.get('knowledge_type')
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        line_type_id = request.query_params.get('line_type_id')
        if line_type_id:
            knowledge_content_type = ContentType.objects.get_for_model(Knowledge)
            queryset = queryset.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=knowledge_content_type,
                    line_type_id=line_type_id
                ).values_list('object_id', flat=True)
            )
        
        system_tag_id = request.query_params.get('system_tag_id')
        if system_tag_id:
            queryset = queryset.filter(system_tags__id=system_tag_id)
        
        operation_tag_id = request.query_params.get('operation_tag_id')
        if operation_tag_id:
            queryset = queryset.filter(operation_tags__id=operation_tag_id)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )
        
        queryset = queryset.distinct().order_by('-updated_at')
        
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = KnowledgeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = KnowledgeListSerializer(queryset, many=True)
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
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以创建知识文档'
            )
        
        serializer = KnowledgeCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        knowledge = serializer.save()
        
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class KnowledgeDetailView(APIView):
    """
    Knowledge detail, update, delete endpoint.
    
    Requirements: 4.4, 4.5
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk, request=None):
        """Get knowledge by ID."""
        try:
            knowledge = Knowledge.objects.select_related(
                'created_by', 'updated_by', 'source_version'
            ).prefetch_related(
                'system_tags', 'operation_tags'
            ).get(pk=pk, is_deleted=False)
            
            if knowledge.status == 'PUBLISHED':
                draft = Knowledge.objects.filter(
                    source_version=knowledge,
                    status='DRAFT',
                    is_deleted=False
                ).select_related(
                    'created_by', 'updated_by', 'source_version'
                ).prefetch_related(
                    'system_tags', 'operation_tags'
                ).first()
                
                if draft and request and request.user.is_admin:
                    return draft
            
            return knowledge
        except Knowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='知识文档不存在'
            )
    
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
        knowledge = self.get_object(pk, request)
        
        if not request.user.is_admin and knowledge.status != 'PUBLISHED':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该知识文档'
            )
        
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
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以更新知识文档'
            )
        
        knowledge = self.get_object(pk, request)
        serializer = KnowledgeUpdateSerializer(
            knowledge, data=request.data, partial=True,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        knowledge = serializer.save()
        
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
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以删除知识文档'
            )
        
        knowledge = self.get_object(pk, request)
        
        if knowledge.is_referenced_by_task():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该知识文档已被任务引用，无法删除'
            )
        
        knowledge.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class KnowledgePublishView(APIView):
    """Knowledge publish endpoint."""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='发布知识文档',
        description='将知识文档从草稿状态发布为已发布状态（仅管理员）',
        responses={
            200: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='知识文档已被任务引用，无法取消发布'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def post(self, request, pk):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以发布知识文档'
            )
        
        try:
            knowledge = Knowledge.objects.select_related(
                'created_by', 'updated_by', 'source_version'
            ).prefetch_related(
                'system_tags', 'operation_tags'
            ).get(pk=pk, is_deleted=False)
        except Knowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='知识文档不存在'
            )
        
        knowledge.updated_by = request.user
        knowledge.save(update_fields=['updated_by'])
        
        published = knowledge.publish()
        
        published = Knowledge.objects.select_related(
            'created_by', 'updated_by'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        ).get(pk=published.pk, is_deleted=False)
        
        response_serializer = KnowledgeDetailSerializer(published)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class KnowledgeUnpublishView(APIView):
    """Knowledge unpublish endpoint."""
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='取消发布知识文档',
        description='将知识文档从已发布状态改为草稿状态（仅管理员）',
        responses={
            200: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='知识文档已被任务引用，无法取消发布'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def post(self, request, pk):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以取消发布知识文档'
            )
        
        try:
            knowledge = Knowledge.objects.select_related(
                'created_by', 'updated_by'
            ).prefetch_related(
                'system_tags', 'operation_tags'
            ).get(pk=pk, is_deleted=False)
        except Knowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='知识文档不存在'
            )
        
        if knowledge.is_referenced_by_task():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该知识文档已被任务引用，无法取消发布'
            )
        
        knowledge.updated_by = request.user
        knowledge.unpublish()
        
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class KnowledgeStatsView(APIView):
    """知识统计端点"""
    permission_classes = [IsAuthenticated]
    
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
        queryset = Knowledge.objects.filter(is_deleted=False)
        
        if not request.user.is_admin:
            queryset = queryset.filter(status='PUBLISHED', is_current=True)
        else:
            queryset = queryset.filter(
                models.Q(status='DRAFT') |
                models.Q(status='PUBLISHED', is_current=True)
            )
        
        # Apply filters
        knowledge_type = request.query_params.get('knowledge_type')
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        line_type_id = request.query_params.get('line_type_id')
        if line_type_id:
            knowledge_content_type = ContentType.objects.get_for_model(Knowledge)
            queryset = queryset.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=knowledge_content_type,
                    line_type_id=line_type_id
                ).values_list('object_id', flat=True)
            )
        
        system_tag_id = request.query_params.get('system_tag_id')
        if system_tag_id:
            queryset = queryset.filter(system_tags__id=system_tag_id)
        
        operation_tag_id = request.query_params.get('operation_tag_id')
        if operation_tag_id:
            queryset = queryset.filter(operation_tags__id=operation_tag_id)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )
        
        queryset = queryset.distinct()
        
        # Calculate stats
        from django.utils import timezone
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        stats = {
            'total': queryset.count(),
            'published': queryset.filter(status='PUBLISHED', is_current=True).count(),
            'emergency': queryset.filter(knowledge_type='EMERGENCY').count(),
            'monthly_new': queryset.filter(created_at__gte=first_day_of_month).count(),
        }
        
        serializer = KnowledgeStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentKnowledgeListView(APIView):
    """学员知识列表端点 - 强制只返回已发布的知识"""
    permission_classes = [IsAuthenticated]
    
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
        queryset = Knowledge.objects.filter(
            is_deleted=False,
            status='PUBLISHED',
            is_current=True
        ).select_related(
            'created_by', 'updated_by'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        )
        
        # Apply filters
        knowledge_type = request.query_params.get('knowledge_type')
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        line_type_id = request.query_params.get('line_type_id')
        if line_type_id:
            knowledge_content_type = ContentType.objects.get_for_model(Knowledge)
            queryset = queryset.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=knowledge_content_type,
                    line_type_id=line_type_id
                ).values_list('object_id', flat=True)
            )
        
        system_tag_id = request.query_params.get('system_tag_id')
        if system_tag_id:
            queryset = queryset.filter(system_tags__id=system_tag_id)
        
        operation_tag_id = request.query_params.get('operation_tag_id')
        if operation_tag_id:
            queryset = queryset.filter(operation_tags__id=operation_tag_id)
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )
        
        queryset = queryset.distinct().order_by('-updated_at')
        
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = KnowledgeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = KnowledgeListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KnowledgeIncrementViewCountView(APIView):
    """Increment knowledge view count endpoint."""
    permission_classes = [IsAuthenticated]
    serializer_class = ViewCountResponseSerializer
    
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
        try:
            knowledge = Knowledge.objects.get(pk=pk, is_deleted=False)
        except Knowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='知识文档不存在'
            )
        
        if not request.user.is_admin and knowledge.status != 'PUBLISHED':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该知识文档'
            )
        
        view_count = knowledge.increment_view_count()
        return Response({'view_count': view_count}, status=status.HTTP_200_OK)
