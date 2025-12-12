"""
Views for knowledge app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter

from .models import KnowledgeCategory, Knowledge, OperationType
from .serializers import (
    KnowledgeCategorySerializer,
    KnowledgeCategoryTreeSerializer,
    KnowledgeSerializer,
    KnowledgeListSerializer,
    OperationTypeSerializer
)
from lms_backend.utils.permissions import IsAdminOrReadOnly, IsManagementRole


class KnowledgeCategoryViewSet(viewsets.ModelViewSet):
    """知识分类视图集"""
    queryset = KnowledgeCategory.objects.all()
    serializer_class = KnowledgeCategorySerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ['level', 'parent']
    search_fields = ['name', 'code']
    ordering_fields = ['level', 'sort_order', 'created_at']
    
    @extend_schema(
        summary="获取分类树",
        description="获取树形结构的分类列表（条线和系统）",
        responses={200: KnowledgeCategoryTreeSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """获取树形结构的分类"""
        # 只获取一级分类（条线），子分类会递归获取
        root_categories = KnowledgeCategory.objects.get_root_categories()
        serializer = KnowledgeCategoryTreeSerializer(root_categories, many=True)
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    @extend_schema(
        summary="获取子分类",
        description="获取指定条线的所有系统",
        parameters=[
            OpenApiParameter(name='parent_id', description='父分类ID（条线ID）', required=True, type=int)
        ],
        responses={200: KnowledgeCategorySerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def children(self, request):
        """获取指定分类的子分类"""
        parent_id = request.query_params.get('parent_id')
        
        if not parent_id:
            return Response({
                'success': False,
                'message': '请提供父分类ID',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            parent = KnowledgeCategory.objects.get(id=parent_id)
        except KnowledgeCategory.DoesNotExist:
            return Response({
                'success': False,
                'message': '父分类不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        children = KnowledgeCategory.objects.get_children(parent)
        serializer = self.get_serializer(children, many=True)
        
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """删除分类（检查是否有关联的知识文档）"""
        instance = self.get_object()
        
        # 检查是否可以删除
        if not instance.can_delete():
            return Response({
                'success': False,
                'message': '该分类下有关联的应急操作手册，无法删除',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 检查是否有子分类
        if instance.children.exists():
            return Response({
                'success': False,
                'message': '该分类下有子分类，无法删除',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance.delete()
        return Response({
            'success': True,
            'message': '删除成功',
            'data': None
        })


class OperationTypeViewSet(viewsets.ModelViewSet):
    """操作类型视图集"""
    queryset = OperationType.objects.all()
    serializer_class = OperationTypeSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    search_fields = ['name', 'code']
    ordering_fields = ['sort_order', 'created_at']


class KnowledgeViewSet(viewsets.ModelViewSet):
    """应急操作手册视图集"""
    queryset = Knowledge.objects.all()
    serializer_class = KnowledgeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'line', 'system', 'creator']
    search_fields = ['title', 'content_scenario', 'content_solution']
    ordering_fields = ['created_at', 'updated_at', 'view_count']
    
    def get_queryset(self):
        """根据用户角色过滤查询集"""
        queryset = super().get_queryset()
        user = self.request.user
        
        # 管理员可以看到所有文档（包括草稿和已删除的）
        if user.has_role('ADMIN'):
            return queryset
        
        # 其他用户只能看到已发布且未删除的文档
        return queryset.filter(status='PUBLISHED', is_deleted=False)
    
    def get_serializer_class(self):
        """根据 action 返回不同的序列化器"""
        if self.action == 'list':
            return KnowledgeListSerializer
        return KnowledgeSerializer
    
    def get_permissions(self):
        """根据 action 返回不同的权限"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsManagementRole()]
        return [IsAuthenticated()]
    
    @extend_schema(
        summary="搜索应急操作手册",
        description="根据关键词搜索应急操作手册（标题、故障场景、解决方案）",
        parameters=[
            OpenApiParameter(name='keyword', description='搜索关键词', required=True, type=str)
        ],
        responses={200: KnowledgeListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """搜索应急操作手册"""
        keyword = request.query_params.get('keyword', '').strip()
        
        if not keyword:
            return Response({
                'success': False,
                'message': '请提供搜索关键词',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # 搜索
        queryset = Knowledge.objects.search(keyword)
        
        # 非管理员只能搜索已发布的文档
        if not request.user.has_role('ADMIN'):
            queryset = queryset.filter(status='PUBLISHED')
        
        serializer = KnowledgeListSerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'message': '搜索成功',
            'data': serializer.data
        })
    
    @extend_schema(
        summary="按条线筛选",
        description="获取指定条线下的所有应急操作手册",
        parameters=[
            OpenApiParameter(name='line_id', description='条线ID', required=True, type=int)
        ],
        responses={200: KnowledgeListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='by-line')
    def by_line(self, request):
        """按条线筛选应急操作手册"""
        line_id = request.query_params.get('line_id')
        
        if not line_id:
            return Response({
                'success': False,
                'message': '请提供条线ID',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            line = KnowledgeCategory.objects.get(id=line_id, level=1)
        except KnowledgeCategory.DoesNotExist:
            return Response({
                'success': False,
                'message': '条线不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 获取该条线下的所有应急操作手册
        queryset = Knowledge.objects.filter(line=line)
        
        # 非管理员只能看到已发布的文档
        if not request.user.has_role('ADMIN'):
            queryset = queryset.filter(status='PUBLISHED', is_deleted=False)
        
        serializer = KnowledgeListSerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    @extend_schema(
        summary="按系统筛选",
        description="获取指定系统下的所有应急操作手册",
        parameters=[
            OpenApiParameter(name='system_id', description='系统ID', required=True, type=int)
        ],
        responses={200: KnowledgeListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'], url_path='by-system')
    def by_system(self, request):
        """按系统筛选应急操作手册"""
        system_id = request.query_params.get('system_id')
        
        if not system_id:
            return Response({
                'success': False,
                'message': '请提供系统ID',
                'data': None
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            system = KnowledgeCategory.objects.get(id=system_id, level=2)
        except KnowledgeCategory.DoesNotExist:
            return Response({
                'success': False,
                'message': '系统不存在',
                'data': None
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 获取该系统下的所有应急操作手册
        queryset = Knowledge.objects.filter(system=system)
        
        # 非管理员只能看到已发布的文档
        if not request.user.has_role('ADMIN'):
            queryset = queryset.filter(status='PUBLISHED', is_deleted=False)
        
        serializer = KnowledgeListSerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'message': '获取成功',
            'data': serializer.data
        })
    
    @extend_schema(
        summary="发布文档",
        description="发布应急操作手册",
        responses={200: KnowledgeSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManagementRole])
    def publish(self, request, pk=None):
        """发布文档"""
        knowledge = self.get_object()
        knowledge.publish(user=request.user)
        
        serializer = self.get_serializer(knowledge)
        return Response({
            'success': True,
            'message': '发布成功',
            'data': serializer.data
        })
    
    @extend_schema(
        summary="归档文档",
        description="归档应急操作手册",
        responses={200: KnowledgeSerializer}
    )
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManagementRole])
    def archive(self, request, pk=None):
        """归档文档"""
        knowledge = self.get_object()
        knowledge.archive(user=request.user)
        
        serializer = self.get_serializer(knowledge)
        return Response({
            'success': True,
            'message': '归档成功',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """软删除应急操作手册"""
        instance = self.get_object()
        instance.soft_delete(user=request.user)
        
        return Response({
            'success': True,
            'message': '删除成功',
            'data': None
        })
