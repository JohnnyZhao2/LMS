"""
Views for knowledge management.

Implements knowledge document and category management endpoints.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
from django.db import models
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter, inline_serializer
from rest_framework import serializers as drf_serializers

from core.exceptions import BusinessError, ErrorCodes
from core.pagination import StandardResultsSetPagination
from apps.users.permissions import IsAdmin

from .models import Knowledge, KnowledgeCategory
from .serializers import (
    KnowledgeCategorySerializer,
    KnowledgeCategoryCreateSerializer,
    KnowledgeCategoryUpdateSerializer,
    KnowledgeCategoryTreeSerializer,
    KnowledgeListSerializer,
    KnowledgeDetailSerializer,
    KnowledgeCreateSerializer,
    KnowledgeUpdateSerializer,
)


# ============ Knowledge Category Views ============

class KnowledgeCategoryListCreateView(APIView):
    """
    Knowledge category list and create endpoint.
    
    Requirements: 4.6
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取知识分类列表',
        description='获取所有知识分类，支持按层级筛选',
        parameters=[
            OpenApiParameter(name='level', type=int, description='分类层级（1或2）'),
            OpenApiParameter(name='parent_id', type=int, description='父分类ID'),
        ],
        responses={200: KnowledgeCategorySerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        queryset = KnowledgeCategory.objects.all()

        # Filter by level
        level = request.query_params.get('level')
        if level == '1':
            queryset = queryset.filter(parent__isnull=True)
        elif level == '2':
            queryset = queryset.filter(parent__isnull=False)
        
        # Filter by parent
        parent_id = request.query_params.get('parent_id')
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        
        queryset = queryset.order_by('sort_order', 'code')
        serializer = KnowledgeCategorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='创建知识分类',
        description='创建新的知识分类（仅管理员）',
        request=KnowledgeCategoryCreateSerializer,
        responses={
            201: KnowledgeCategorySerializer,
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
                message='只有管理员可以创建知识分类'
            )
        
        serializer = KnowledgeCategoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        
        response_serializer = KnowledgeCategorySerializer(category)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class KnowledgeCategoryDetailView(APIView):
    """
    Knowledge category detail, update, delete endpoint.
    """
    permission_classes = [IsAuthenticated]
    
    def get_object(self, pk):
        """Get category by ID."""
        try:
            return KnowledgeCategory.objects.get(pk=pk)
        except KnowledgeCategory.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='分类不存在'
            )
    
    @extend_schema(
        summary='获取知识分类详情',
        description='获取指定知识分类的详细信息',
        responses={
            200: KnowledgeCategorySerializer,
            404: OpenApiResponse(description='分类不存在'),
        },
        tags=['知识管理']
    )
    def get(self, request, pk):
        category = self.get_object(pk)
        serializer = KnowledgeCategorySerializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)

    
    @extend_schema(
        summary='更新知识分类',
        description='更新知识分类信息（仅管理员）',
        request=KnowledgeCategoryUpdateSerializer,
        responses={
            200: KnowledgeCategorySerializer,
            400: OpenApiResponse(description='参数错误'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='分类不存在'),
        },
        tags=['知识管理']
    )
    def patch(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以更新知识分类'
            )
        
        category = self.get_object(pk)
        serializer = KnowledgeCategoryUpdateSerializer(
            category, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        
        response_serializer = KnowledgeCategorySerializer(category)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary='删除知识分类',
        description='删除知识分类（仅管理员，有子分类或关联知识时禁止删除）',
        responses={
            204: OpenApiResponse(description='删除成功'),
            400: OpenApiResponse(description='分类有子分类或关联知识，无法删除'),
            403: OpenApiResponse(description='无权限'),
            404: OpenApiResponse(description='分类不存在'),
        },
        tags=['知识管理']
    )
    def delete(self, request, pk):
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以删除知识分类'
            )
        
        category = self.get_object(pk)
        
        # Check for children
        if category.children.exists():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该分类有子分类，无法删除'
            )
        
        # Check for knowledge relations
        if category.knowledge_relations.exists():
            raise BusinessError(
                code=ErrorCodes.RESOURCE_REFERENCED,
                message='该分类有关联知识，无法删除'
            )
        
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class KnowledgeCategoryTreeView(APIView):
    """
    Knowledge category tree endpoint.
    
    Returns categories in tree structure with children.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取知识分类树',
        description='获取知识分类的树形结构',
        responses={200: KnowledgeCategoryTreeSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        # Get only root categories (level 1)
        queryset = KnowledgeCategory.objects.filter(
            parent__isnull=True
        ).order_by('sort_order', 'code')
        
        serializer = KnowledgeCategoryTreeSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ============ Knowledge Views ============

class KnowledgeListCreateView(APIView):
    """
    Knowledge list and create endpoint.
    
    Requirements: 4.1, 4.2, 4.3, 4.6
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary='获取知识文档列表',
        description='获取知识文档列表，支持分类和类型筛选',
        parameters=[
            OpenApiParameter(name='knowledge_type', type=str, description='知识类型（EMERGENCY/OTHER）'),
            OpenApiParameter(name='category_id', type=int, description='分类ID'),
            OpenApiParameter(name='primary_category_id', type=int, description='一级分类ID'),
            OpenApiParameter(name='secondary_category_id', type=int, description='二级分类ID'),
            OpenApiParameter(name='search', type=str, description='搜索标题或摘要'),
        ],
        responses={200: KnowledgeListSerializer(many=True)},
        tags=['知识管理']
    )
    def get(self, request):
        queryset = Knowledge.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by'
        ).prefetch_related(
            'category_relations__category'
        )
        
        # Filter by knowledge type
        knowledge_type = request.query_params.get('knowledge_type')
        if knowledge_type:
            queryset = queryset.filter(knowledge_type=knowledge_type)
        
        # Filter by category
        category_id = request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_relations__category_id=category_id)
        
        # Filter by primary category (level 1)
        primary_category_id = request.query_params.get('primary_category_id')
        if primary_category_id:
            queryset = queryset.filter(
                category_relations__category_id=primary_category_id
            ) | queryset.filter(
                category_relations__category__parent_id=primary_category_id
            )
        
        # Filter by secondary category (level 2)
        secondary_category_id = request.query_params.get('secondary_category_id')
        if secondary_category_id:
            queryset = queryset.filter(
                category_relations__category_id=secondary_category_id
            )
        
        # Search by title or summary
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                models.Q(title__icontains=search) |
                models.Q(summary__icontains=search)
            )
        
        queryset = queryset.distinct().order_by('-updated_at')
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
    
    def get_object(self, pk):
        """Get knowledge by ID."""
        try:
            return Knowledge.objects.select_related(
                'created_by', 'updated_by'
            ).prefetch_related(
                'category_relations__category'
            ).get(pk=pk, is_deleted=False)
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
            404: OpenApiResponse(description='知识文档不存在'),
        },
        tags=['知识管理']
    )
    def get(self, request, pk):
        knowledge = self.get_object(pk)
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
        # Check admin permission
        if not request.user.is_admin:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员可以更新知识文档'
            )
        
        knowledge = self.get_object(pk)
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
        
        knowledge = self.get_object(pk)
        
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
        try:
            knowledge = Knowledge.objects.get(pk=pk, is_deleted=False)
        except Knowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='知识文档不存在'
            )
        
        knowledge.increment_view_count()
        return Response(
            {'view_count': knowledge.view_count},
            status=status.HTTP_200_OK
        )
