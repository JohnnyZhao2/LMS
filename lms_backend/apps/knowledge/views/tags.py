"""
Tag management views.

Implements:
- Tag CRUD
- Tag listing with cascade filtering

Requirements: 4.6
"""
from django.contrib.contenttypes.models import ContentType
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from core.exceptions import BusinessError, ErrorCodes
from apps.knowledge.models import Knowledge, Tag, ResourceLineType
from apps.knowledge.serializers import TagSerializer


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
        tag_type = request.query_params.get('tag_type', '').strip()
        line_type_id = request.query_params.get('line_type_id')
        search = request.query_params.get('search', '').strip()
        limit = int(request.query_params.get('limit', 50))
        active_only = request.query_params.get('active_only', 'true').lower() == 'true'
        
        # 级联筛选
        if line_type_id and tag_type in ['SYSTEM', 'OPERATION']:
            knowledge_ids = ResourceLineType.objects.filter(
                content_type=ContentType.objects.get_for_model(Knowledge),
                line_type_id=line_type_id
            ).values_list('object_id', flat=True)
            knowledge_qs = Knowledge.objects.filter(
                is_deleted=False,
                id__in=knowledge_ids
            )
            
            if tag_type == 'SYSTEM':
                tag_ids = knowledge_qs.filter(
                    system_tags__isnull=False
                ).values_list('system_tags__id', flat=True).distinct()
            else:  # OPERATION
                tag_ids = knowledge_qs.filter(
                    operation_tags__isnull=False
                ).values_list('operation_tags__id', flat=True).distinct()
            
            queryset = Tag.objects.filter(id__in=tag_ids, tag_type=tag_type)
        else:
            queryset = Tag.objects.all()
            
            if tag_type:
                queryset = queryset.filter(tag_type=tag_type)
        
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        queryset = queryset.order_by('sort_order', 'name')[:limit]
        serializer = TagSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class TagCreateView(APIView):
    """创建标签端点（仅管理员）"""
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
    """标签详情、更新、删除端点"""
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
