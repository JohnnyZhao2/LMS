"""
知识文档仓储实现

负责所有知识文档相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q
from django.contrib.contenttypes.models import ContentType

from core.base_repository import BaseRepository
from .models import Knowledge, Tag, ResourceLineType


class KnowledgeRepository(BaseRepository[Knowledge]):
    """知识文档仓储"""
    
    model = Knowledge
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Knowledge]:
        """
        根据 ID 获取知识文档
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            知识文档对象或 None
        """
        qs = self.model.objects.select_related(
            'created_by',
            'updated_by',
            'source_version'
        ).prefetch_related(
            'system_tags',
            'operation_tags'
        )
        
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        
        return qs.filter(pk=pk).first()
    
    def is_referenced_by_task(self, knowledge_id: int) -> bool:
        """
        检查知识文档是否被任务引用
        
        Args:
            knowledge_id: 知识文档 ID
            
        Returns:
            True 如果被引用
        """
        try:
            from apps.tasks.models import TaskKnowledge
            return TaskKnowledge.objects.filter(
                knowledge_id=knowledge_id
            ).exists()
        except ImportError:
            # tasks app 尚未实现
            return False
    
    def get_current_version(
        self,
        resource_uuid: str
    ) -> Optional[Knowledge]:
        """
        获取资源的当前版本
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            当前版本或 None
        """
        return self.model.objects.filter(
            resource_uuid=resource_uuid,
            is_current=True,
            is_deleted=False
        ).first()
    
    def get_all_with_filters(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-updated_at'
    ) -> QuerySet[Knowledge]:
        """
        获取所有知识文档（只返回当前版本）
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            is_deleted=False,
            is_current=True  # 只返回当前版本
        ).select_related(
            'created_by', 'updated_by'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        )
        
        # 应用其他过滤条件
        if filters:
            if filters.get('knowledge_type'):
                qs = qs.filter(knowledge_type=filters['knowledge_type'])
            if filters.get('line_type_id'):
                content_type = ContentType.objects.get_for_model(self.model)
                qs = qs.filter(
                    id__in=ResourceLineType.objects.filter(
                        content_type=content_type,
                        line_type_id=filters['line_type_id']
                    ).values_list('object_id', flat=True)
                )
            if filters.get('system_tag_id'):
                qs = qs.filter(system_tags__id=filters['system_tag_id'])
            if filters.get('operation_tag_id'):
                qs = qs.filter(operation_tags__id=filters['operation_tag_id'])
        
        # 搜索
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(content__icontains=search)
            )
        
        # 排序
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs.distinct()
    
    def get_draft_for_published(
        self,
        published_knowledge_id: int
    ) -> Optional[Knowledge]:
        """
        获取当前版本的非当前版本（历史版本）
        
        Args:
            published_knowledge_id: 当前版本知识文档 ID
            
        Returns:
            非当前版本或 None
        """
        return self.model.objects.filter(
            source_version_id=published_knowledge_id,
            is_current=False,
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by', 'source_version'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        ).first()
    
    def get_version_numbers(
        self,
        resource_uuid: str
    ) -> List[int]:
        """
        获取资源的所有版本号列表
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            版本号列表
        """
        return list(
            self.model.objects.filter(
                resource_uuid=resource_uuid,
                is_deleted=False
            ).values_list('version_number', flat=True)
        )
    
    def unset_current_flag_for_others(
        self,
        resource_uuid: str,
        exclude_pk: int
    ) -> None:
        """
        取消其他版本的 is_current 标志
        
        Args:
            resource_uuid: 资源 UUID
            exclude_pk: 要排除的主键（保持 is_current=True）
        """
        self.model.objects.filter(
            resource_uuid=resource_uuid
        ).exclude(pk=exclude_pk).update(is_current=False)


class TagRepository(BaseRepository[Tag]):
    """标签仓储"""
    
    model = Tag
    
    def get_by_type(self, tag_type: str) -> QuerySet[Tag]:
        """
        按类型获取标签
        
        Args:
            tag_type: 标签类型（LINE, SYSTEM, OPERATION）
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            tag_type=tag_type,
            is_active=True
        ).order_by('sort_order', 'name')
    
    def get_line_types(self) -> QuerySet[Tag]:
        """获取条线类型"""
        return self.get_by_type('LINE')
    
    def get_system_tags(
        self,
        line_type_id: int = None
    ) -> QuerySet[Tag]:
        """
        获取系统标签
        
        Args:
            line_type_id: 可选的条线类型 ID（用于过滤）
            
        Returns:
            QuerySet
        """
        qs = self.get_by_type('SYSTEM')
        if line_type_id:
            qs = qs.filter(parent_id=line_type_id)
        return qs
    
    def get_operation_tags(self) -> QuerySet[Tag]:
        """获取操作标签"""
        return self.get_by_type('OPERATION')
