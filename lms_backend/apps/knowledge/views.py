"""
Views for knowledge management.

Implements knowledge document management endpoints.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
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
from apps.users.permissions import IsAdmin

from .models import Knowledge, Tag, ResourceLineType
from .serializers import (
    KnowledgeListSerializer,
    KnowledgeDetailSerializer,
    KnowledgeCreateSerializer,
    KnowledgeUpdateSerializer,
    KnowledgeStatsSerializer,
    TagSerializer,
    TagSimpleSerializer,
)


# ============ Knowledge Views ============

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
        
        # 权限过滤：普通用户只能看到已发布的知识
        if not request.user.is_admin:
            queryset = queryset.filter(status='PUBLISHED', is_current=True)
        else:
            # 管理员：支持新的 filter_type 筛选
            filter_type = request.query_params.get('filter_type', 'ALL')
            
            # 获取所有已发布版本的草稿（用于判断"修订中"状态）
            # 这些草稿不应该单独显示在列表中
            draft_of_published_ids = Knowledge.objects.filter(
                is_deleted=False,
                status='DRAFT',
                source_version__isnull=False
            ).values_list('id', flat=True)
            
            # 获取有待发布草稿的已发布版本ID
            published_with_draft_ids = Knowledge.objects.filter(
                is_deleted=False,
                status='DRAFT',
                source_version__isnull=False
            ).values_list('source_version_id', flat=True)
            
            if filter_type == 'PUBLISHED_CLEAN':
                # 已发布且无待发布修改
                queryset = queryset.filter(
                    status='PUBLISHED',
                    is_current=True
                ).exclude(id__in=published_with_draft_ids)
            elif filter_type == 'REVISING':
                # 修订中：已发布但有待发布的草稿修改
                queryset = queryset.filter(
                    status='PUBLISHED',
                    is_current=True,
                    id__in=published_with_draft_ids
                )
            elif filter_type == 'UNPUBLISHED':
                # 未发布：从未发布过的新草稿（source_version 为空的草稿）
                queryset = queryset.filter(
                    status='DRAFT',
                    source_version__isnull=True
                )
            else:  # ALL
                # 全部：已发布版本 + 从未发布的草稿
                # 排除：已发布版本的草稿副本（这些会通过 has_pending_draft 显示在已发布卡片上）
                queryset = queryset.filter(
                    models.Q(status='PUBLISHED', is_current=True) |
                    models.Q(status='DRAFT', source_version__isnull=True)
                )
            
            # 兼容旧的 status 参数（已废弃，但保留兼容性）
            status_param = request.query_params.get('status')
            if status_param and filter_type == 'ALL':
                if status_param == 'DRAFT':
                    queryset = queryset.filter(status='DRAFT')
                elif status_param == 'PUBLISHED':
                    queryset = queryset.filter(status='PUBLISHED', is_current=True)
        
        # Filter by knowledge type
        knowledge_type = request.query_params.get('knowledge_type')
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        # Filter by line type ID (通过ResourceLineType关系表)
        line_type_id = request.query_params.get('line_type_id')
        if line_type_id:
            from django.contrib.contenttypes.models import ContentType
            from .models import ResourceLineType
            knowledge_content_type = ContentType.objects.get_for_model(Knowledge)
            queryset = queryset.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=knowledge_content_type,
                    line_type_id=line_type_id
                ).values_list('object_id', flat=True)
            )
        
        # Filter by system tag ID
        system_tag_id = request.query_params.get('system_tag_id')
        if system_tag_id:
            queryset = queryset.filter(system_tags__id=system_tag_id)
        
        # Filter by operation tag ID
        operation_tag_id = request.query_params.get('operation_tag_id')
        if operation_tag_id:
            queryset = queryset.filter(operation_tags__id=operation_tag_id)
        
        # Search by title or content
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )
        
        queryset = queryset.distinct().order_by('-updated_at')
        
        # Apply pagination
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
        # Check admin permission
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
        """
        Get knowledge by ID.
        
        如果获取的是已发布的知识，且存在关联的草稿：
        - 管理员：返回草稿（用于编辑）
        - 普通用户：返回已发布版本
        
        否则返回原记录。
        """
        try:
            knowledge = Knowledge.objects.select_related(
                'created_by', 'updated_by', 'source_version'
            ).prefetch_related(
                'system_tags', 'operation_tags'
            ).get(pk=pk, is_deleted=False)
            
            # 如果是已发布的知识，检查是否有关联的草稿
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
                
                # 只有管理员才返回草稿，普通用户返回已发布版本
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
        description='获取指定知识文档的详细信息。普通用户只能查看已发布的知识，管理员可以查看所有（包括草稿）',
        responses={
            200: KnowledgeDetailSerializer,
            403: OpenApiResponse(description='无权访问该知识文档'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def get(self, request, pk):
        knowledge = self.get_object(pk, request)
        
        # 权限检查：非管理员只能查看已发布的知识
        if not request.user.is_admin and knowledge.status != 'PUBLISHED':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该知识文档'
            )
        
        serializer = KnowledgeDetailSerializer(knowledge)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='更新知识文档',
        description='更新知识文档内容（仅管理员）。如果知识当前是已发布状态，更新后会自动保存为草稿，不影响已发布版本。只有通过发布接口才会更新已发布的内容。',
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
        # Check admin permission
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
        """
        Delete knowledge document.
        
        Requirements: 4.5
        Property 12: 被引用知识删除保护
        """
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以删除知识文档'
            )
        
        knowledge = self.get_object(pk, request)
        
        # Check if referenced by tasks
        if knowledge.is_referenced_by_task():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该知识文档已被任务引用，无法删除'
            )
        
        # Soft delete
        knowledge.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ViewCountResponseSerializer(drf_serializers.Serializer):
    """Serializer for view count response."""
    view_count = drf_serializers.IntegerField()


class KnowledgePublishView(APIView):
    """
    Knowledge publish endpoint.
    
    发布知识文档，将草稿状态改为已发布，使其可用于任务分配。
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='发布知识文档',
        description='将知识文档从草稿状态发布为已发布状态，使其可用于任务分配（仅管理员）',
        responses={
            200: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='知识文档已被任务引用，无法取消发布'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def post(self, request, pk):
        """
        Publish knowledge document.
        
        将知识文档状态从草稿改为已发布。
        - 新草稿：直接将状态改为已发布
        - 有关联已发布版本的草稿：更新已发布版本，删除草稿
        """
        # Check admin permission
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
        
        # 更新 updated_by
        knowledge.updated_by = request.user
        knowledge.save(update_fields=['updated_by'])
        
        # 发布知识，返回已发布版本
        published = knowledge.publish()
        
        # 重新加载已发布版本（包含更新后的内容和关联）
        published = Knowledge.objects.select_related(
            'created_by', 'updated_by'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        ).get(pk=published.pk, is_deleted=False)
        
        response_serializer = KnowledgeDetailSerializer(published)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class KnowledgeUnpublishView(APIView):
    """
    Knowledge unpublish endpoint.
    
    取消发布知识文档，将已发布状态改为草稿。
    注意：如果知识已被任务引用，无法取消发布。
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='取消发布知识文档',
        description='将知识文档从已发布状态改为草稿状态（仅管理员）。如果知识已被任务引用，无法取消发布。',
        responses={
            200: KnowledgeDetailSerializer,
            400: OpenApiResponse(description='知识文档已被任务引用，无法取消发布'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def post(self, request, pk):
        """
        Unpublish knowledge document.
        
        将知识文档状态从已发布改为草稿。
        """
        # Check admin permission
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
        
        # 检查是否被任务引用
        if knowledge.is_referenced_by_task():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该知识文档已被任务引用，无法取消发布'
            )
        
        # 更新 updated_by
        knowledge.updated_by = request.user
        knowledge.unpublish()
        
        response_serializer = KnowledgeDetailSerializer(knowledge)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class KnowledgeStatsView(APIView):
    """
    知识统计端点
    
    返回知识文档的统计数据（总文档数、已发布数、应急类型数）。
    支持与列表接口相同的筛选参数，统计数据基于筛选后的结果。
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取知识统计',
        description='获取知识文档的统计数据（总文档数、已发布数、应急类型数）。支持条线类型、知识类型和系统标签筛选。普通用户只能看到已发布的知识，管理员可以看到所有（包括草稿）',
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
        """
        获取知识统计
        
        使用与列表接口相同的筛选逻辑，但只返回统计数据而不是列表数据。
        """
        queryset = Knowledge.objects.filter(
            is_deleted=False
        )
        
        # 权限过滤：普通用户只能看到已发布的知识
        # 管理员默认看到所有（包括草稿）
        if not request.user.is_admin:
            queryset = queryset.filter(status='PUBLISHED', is_current=True)
        else:
            # 管理员：包含草稿和已发布
            queryset = queryset.filter(
                models.Q(status='DRAFT') |
                models.Q(status='PUBLISHED', is_current=True)
            )
        
        # Filter by knowledge type
        knowledge_type = request.query_params.get('knowledge_type')
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        # Filter by line type ID (通过ResourceLineType关系表)
        line_type_id = request.query_params.get('line_type_id')
        if line_type_id:
            knowledge_content_type = ContentType.objects.get_for_model(Knowledge)
            queryset = queryset.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=knowledge_content_type,
                    line_type_id=line_type_id
                ).values_list('object_id', flat=True)
            )
        
        # Filter by system tag ID
        system_tag_id = request.query_params.get('system_tag_id')
        if system_tag_id:
            queryset = queryset.filter(system_tags__id=system_tag_id)
        
        # Filter by operation tag ID
        operation_tag_id = request.query_params.get('operation_tag_id')
        if operation_tag_id:
            queryset = queryset.filter(operation_tags__id=operation_tag_id)
        
        # Search by title or content
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )
        
        queryset = queryset.distinct()
        
        # 计算统计数据
        total = queryset.count()
        published = queryset.filter(status='PUBLISHED', is_current=True).count()
        emergency = queryset.filter(knowledge_type='EMERGENCY').count()
        
        # 计算本月新增（基于 created_at）
        from django.utils import timezone
        from datetime import timedelta
        now = timezone.now()
        first_day_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_new = queryset.filter(created_at__gte=first_day_of_month).count()
        
        stats = {
            'total': total,
            'published': published,
            'emergency': emergency,
            'monthly_new': monthly_new,
        }
        
        serializer = KnowledgeStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentKnowledgeListView(APIView):
    """
    学员知识列表端点
    
    独立于管理员接口，强制只返回已发布的知识。
    即使用户同时拥有管理员角色，此接口也只返回已发布内容。
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取学员知识列表',
        description='获取已发布的知识文档列表。此接口专为学员端设计，强制只返回已发布的知识。',
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
        # 强制只返回已发布的知识
        queryset = Knowledge.objects.filter(
            is_deleted=False,
            status='PUBLISHED',
            is_current=True
        ).select_related(
            'created_by', 'updated_by'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        )
        
        # Filter by knowledge type
        knowledge_type = request.query_params.get('knowledge_type')
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        # Filter by line type ID (通过ResourceLineType关系表)
        line_type_id = request.query_params.get('line_type_id')
        if line_type_id:
            knowledge_content_type = ContentType.objects.get_for_model(Knowledge)
            queryset = queryset.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=knowledge_content_type,
                    line_type_id=line_type_id
                ).values_list('object_id', flat=True)
            )
        
        # Filter by system tag ID
        system_tag_id = request.query_params.get('system_tag_id')
        if system_tag_id:
            queryset = queryset.filter(system_tags__id=system_tag_id)
        
        # Filter by operation tag ID
        operation_tag_id = request.query_params.get('operation_tag_id')
        if operation_tag_id:
            queryset = queryset.filter(operation_tags__id=operation_tag_id)
        
        # Search by title or content
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(content__icontains=search)
            )
        
        queryset = queryset.distinct().order_by('-updated_at')
        
        # Apply pagination
        paginator = StandardResultsSetPagination()
        page = paginator.paginate_queryset(queryset, request)
        if page is not None:
            serializer = KnowledgeListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = KnowledgeListSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class StudentKnowledgeDetailView(APIView):
    """
    学员知识详情端点
    
    独立于管理员接口，强制只返回已发布的知识详情。
    即使用户同时拥有管理员角色，此接口也只返回已发布内容，不会返回草稿版本。
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取学员知识详情',
        description='获取已发布的知识文档详情。此接口专为学员端设计，强制只返回已发布的知识，不会返回草稿版本。',
        responses={
            200: KnowledgeDetailSerializer,
            403: OpenApiResponse(description='无权访问该知识文档'),
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def get(self, request, pk):
        """
        获取学员知识详情
        
        强制只返回已发布的知识，不会返回草稿版本。
        """
        try:
            knowledge = Knowledge.objects.select_related(
                'created_by', 'updated_by', 'source_version'
            ).prefetch_related(
                'system_tags', 'operation_tags'
            ).get(
                pk=pk,
                is_deleted=False,
                status='PUBLISHED',
                is_current=True
            )
        except Knowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='知识文档不存在或未发布'
            )
        
        serializer = KnowledgeDetailSerializer(knowledge)
        return Response(serializer.data, status=status.HTTP_200_OK)


class KnowledgeIncrementViewCountView(APIView):
    """
    Increment knowledge view count endpoint.
    
    Used when a user views a knowledge document.
    """
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
        """
        增加知识文档阅读次数
        
        每次调用此接口时，阅读次数增加1。
        普通用户只能对已发布的知识进行计数，管理员可以对所有知识进行计数。
        """
        try:
            knowledge = Knowledge.objects.get(pk=pk, is_deleted=False)
        except Knowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='知识文档不存在'
            )
        
        # 权限检查：普通用户只能对已发布的知识进行计数
        if not request.user.is_admin and knowledge.status != 'PUBLISHED':
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问该知识文档'
            )
        
        # 增加阅读次数（原子操作）
        view_count = knowledge.increment_view_count()
        return Response(
            {'view_count': view_count},
            status=status.HTTP_200_OK
        )


# ============ Tag Management Views ============

class TagListView(APIView):
    """
    统一标签列表端点
    
    返回标签列表，支持按类型筛选、搜索和分页。
    支持级联筛选：根据已选条线类型，动态返回该条线下知识使用的系统/操作标签。
    
    Requirements: 4.6
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取标签列表',
        description='''获取标签列表，支持按类型筛选和搜索。
        
级联筛选：
- 当 tag_type=SYSTEM 且提供 line_type_id 时，返回该条线下知识使用的系统标签
- 当 tag_type=OPERATION 且提供 line_type_id 时，返回该条线下知识使用的操作标签
''',
        parameters=[
            OpenApiParameter(name='tag_type', type=str, description='标签类型（LINE/SYSTEM/OPERATION）'),
            OpenApiParameter(name='line_type_id', type=int, description='条线类型ID（用于级联筛选系统/操作标签）'),
            OpenApiParameter(name='search', type=str, description='搜索关键词'),
            OpenApiParameter(name='limit', type=int, description='返回数量限制（默认50）'),
            OpenApiParameter(name='active_only', type=bool, description='只返回启用的标签（默认true）'),
        ],
        responses={200: TagSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        """获取标签列表"""
        tag_type = request.query_params.get('tag_type', '').strip()
        line_type_id = request.query_params.get('line_type_id')
        search = request.query_params.get('search', '').strip()
        limit = int(request.query_params.get('limit', 50))
        active_only = request.query_params.get('active_only', 'true').lower() == 'true'
        
        # 级联筛选：根据条线类型获取该条线下知识使用的标签
        if line_type_id and tag_type in ['SYSTEM', 'OPERATION']:
            # 查询该条线下的所有知识
            knowledge_ids = ResourceLineType.objects.filter(
                content_type=ContentType.objects.get_for_model(Knowledge),
                line_type_id=line_type_id
            ).values_list('object_id', flat=True)
            knowledge_qs = Knowledge.objects.filter(
                is_deleted=False,
                id__in=knowledge_ids
            )
            
            if tag_type == 'SYSTEM':
                # 获取这些知识使用的系统标签
                tag_ids = knowledge_qs.filter(
                    system_tags__isnull=False
                ).values_list('system_tags__id', flat=True).distinct()
            else:  # OPERATION
                # 获取这些知识使用的操作标签
                tag_ids = knowledge_qs.filter(
                    operation_tags__isnull=False
                ).values_list('operation_tags__id', flat=True).distinct()
            
            queryset = Tag.objects.filter(id__in=tag_ids, tag_type=tag_type)
        else:
            # 普通查询
            queryset = Tag.objects.all()
            
            # 按标签类型筛选
            if tag_type:
                queryset = queryset.filter(tag_type=tag_type)
        
        # 只返回启用的标签
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        # 搜索过滤
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        queryset = queryset.order_by('sort_order', 'name')[:limit]
        serializer = TagSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TagCreateView(APIView):
    """
    创建标签端点（仅管理员）
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='创建标签',
        description='创建新标签（仅管理员）',
        request=TagSerializer,
        responses={
            201: TagSerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
        },
        tags=['知识管理']
    )
    def post(self, request):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以创建标签'
            )
        
        serializer = TagSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class TagDetailView(APIView):
    """
    标签详情、更新、删除端点
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        try:
            return Tag.objects.get(pk=pk)
        except Tag.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='标签不存在'
            )
    
    @extend_schema(
        summary='获取标签详情',
        responses={200: TagSerializer},
        tags=['知识管理']
    )
    def get(self, request, pk):
        tag = self.get_object(pk)
        serializer = TagSerializer(tag)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='更新标签',
        request=TagSerializer,
        responses={200: TagSerializer},
        tags=['知识管理']
    )
    def patch(self, request, pk):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以更新标签'
            )
        
        tag = self.get_object(pk)
        serializer = TagSerializer(tag, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='删除标签',
        responses={204: OpenApiResponse(description='删除成功')},
        tags=['知识管理']
    )
    def delete(self, request, pk):
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以删除标签'
            )
        
        tag = self.get_object(pk)
        
        # 检查是否被使用
        if tag.tag_type == 'LINE' and tag.knowledge_by_line.filter(is_deleted=False).exists():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该条线类型已被知识文档使用，无法删除'
            )
        if tag.tag_type == 'SYSTEM' and tag.knowledge_by_system.filter(is_deleted=False).exists():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该系统标签已被知识文档使用，无法删除'
            )
        if tag.tag_type == 'OPERATION' and tag.knowledge_by_operation.filter(is_deleted=False).exists():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该操作标签已被知识文档使用，无法删除'
            )
        
        tag.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
