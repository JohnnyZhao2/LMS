"""
知识文档仓储实现

负责所有知识文档相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q
from django.contrib.contenttypes.models import ContentType

from core.base_repository import BaseRepository
from .models import Knowledge, Tag, ResourceLineType
from .domain.models import KnowledgeDomain
from .domain.mappers import KnowledgeMapper


class KnowledgeRepository(BaseRepository[Knowledge]):
    """知识文档仓储"""
    
    model = Knowledge
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Knowledge]:
        """
        根据 ID 获取知识文档（Django Model）
        
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
    
    def get_domain_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[KnowledgeDomain]:
        """
        根据 ID 获取知识文档（Domain Model）
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            知识文档领域模型或 None
        """
        knowledge = self.get_by_id(pk, include_deleted)
        if knowledge:
            return KnowledgeMapper.to_domain(knowledge)
        return None
    
    def get_published_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        limit: int = None,
        offset: int = None
    ) -> QuerySet[Knowledge]:
        """
        获取已发布的知识文档列表（Django Model QuerySet）
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            status='PUBLISHED',
            is_deleted=False,
            is_current=True
        ).select_related('created_by', 'updated_by')
        
        # 应用过滤条件
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
                Q(summary__icontains=search) |
                Q(content__icontains=search)
            )
        
        # 排序
        if ordering:
            qs = qs.order_by(ordering)
        
        # 分页
        if limit:
            qs = qs[offset:offset+limit] if offset else qs[:limit]
        
        return qs
    
    def get_published_list_domain(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        limit: int = None,
        offset: int = None
    ) -> List[KnowledgeDomain]:
        """
        获取已发布的知识文档列表（Domain Model）
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            知识文档领域模型列表
        """
        qs = self.get_published_list(filters, search, ordering, limit, offset)
        return [KnowledgeMapper.to_domain(k) for k in qs]
    
    def get_draft_for_resource(
        self,
        resource_uuid: str
    ) -> Optional[Knowledge]:
        """
        获取资源的草稿版本（Django Model）
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            草稿版本或 None
        """
        return self.model.objects.filter(
            resource_uuid=resource_uuid,
            status='DRAFT',
            is_deleted=False
        ).first()
    
    def get_draft_for_resource_domain(
        self,
        resource_uuid: str
    ) -> Optional[KnowledgeDomain]:
        """
        获取资源的草稿版本（Domain Model）
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            草稿版本领域模型或 None
        """
        knowledge = self.get_draft_for_resource(resource_uuid)
        if knowledge:
            return KnowledgeMapper.to_domain(knowledge)
        return None
    
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
    
    def get_current_published_version(
        self,
        resource_uuid: str
    ) -> Optional[Knowledge]:
        """
        获取资源的当前已发布版本（Django Model）
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            当前已发布版本或 None
        """
        return self.model.objects.filter(
            resource_uuid=resource_uuid,
            status='PUBLISHED',
            is_current=True,
            is_deleted=False
        ).first()
    
    def get_current_published_version_domain(
        self,
        resource_uuid: str
    ) -> Optional[KnowledgeDomain]:
        """
        获取资源的当前已发布版本（Domain Model）
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            当前已发布版本领域模型或 None
        """
        knowledge = self.get_current_published_version(resource_uuid)
        if knowledge:
            return KnowledgeMapper.to_domain(knowledge)
        return None
    
    def get_all_with_filters(
        self,
        filters: dict = None,
        search: str = None,
        filter_type: str = None,
        ordering: str = '-updated_at'
    ) -> QuerySet[Knowledge]:
        """
        获取所有知识文档（支持管理员筛选）
        
        Args:
            filters: 过滤条件
            search: 搜索关键词
            filter_type: 筛选类型（ALL/PUBLISHED_CLEAN/REVISING/UNPUBLISHED）
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by', 'source_version'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        )
        
        # 应用 filter_type 筛选
        if filter_type:
            draft_of_published_ids = self.model.objects.filter(
                is_deleted=False,
                status='DRAFT',
                source_version__isnull=False
            ).values_list('id', flat=True)
            
            published_with_draft_ids = self.model.objects.filter(
                is_deleted=False,
                status='DRAFT',
                source_version__isnull=False
            ).values_list('source_version_id', flat=True)
            
            if filter_type == 'PUBLISHED_CLEAN':
                qs = qs.filter(
                    status='PUBLISHED',
                    is_current=True
                ).exclude(id__in=published_with_draft_ids)
            elif filter_type == 'REVISING':
                qs = qs.filter(
                    status='PUBLISHED',
                    is_current=True,
                    id__in=published_with_draft_ids
                )
            elif filter_type == 'UNPUBLISHED':
                qs = qs.filter(
                    status='DRAFT',
                    source_version__isnull=True
                )
            else:  # ALL
                qs = qs.filter(
                    Q(status='PUBLISHED', is_current=True) |
                    Q(status='DRAFT', source_version__isnull=True)
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
            if filters.get('status'):
                if filters['status'] == 'DRAFT':
                    qs = qs.filter(status='DRAFT')
                elif filters['status'] == 'PUBLISHED':
                    qs = qs.filter(status='PUBLISHED', is_current=True)
        
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
        获取已发布知识的草稿版本（Django Model）
        
        Args:
            published_knowledge_id: 已发布知识文档 ID
            
        Returns:
            草稿版本或 None
        """
        return self.model.objects.filter(
            source_version_id=published_knowledge_id,
            status='DRAFT',
            is_deleted=False
        ).select_related(
            'created_by', 'updated_by', 'source_version'
        ).prefetch_related(
            'system_tags', 'operation_tags'
        ).first()
    
    def get_draft_for_published_domain(
        self,
        published_knowledge_id: int
    ) -> Optional[KnowledgeDomain]:
        """
        获取已发布知识的草稿版本（Domain Model）
        
        Args:
            published_knowledge_id: 已发布知识文档 ID
            
        Returns:
            草稿版本领域模型或 None
        """
        knowledge = self.get_draft_for_published(published_knowledge_id)
        if knowledge:
            return KnowledgeMapper.to_domain(knowledge)
        return None
    
    def create_from_domain(
        self,
        knowledge_domain: KnowledgeDomain
    ) -> Knowledge:
        """
        从 Domain Model 创建 Django Model
        
        Args:
            knowledge_domain: 知识文档领域模型
            
        Returns:
            创建的 Django Model 实例
        """
        data = KnowledgeMapper.to_orm_data(knowledge_domain)
        knowledge = self.model.objects.create(**data)
        
        # 设置标签关系
        if knowledge_domain.line_type_id:
            from .models import Tag
            line_type = Tag.objects.get(id=knowledge_domain.line_type_id)
            knowledge.set_line_type(line_type)
        
        if knowledge_domain.system_tag_ids:
            knowledge.system_tags.set(knowledge_domain.system_tag_ids)
        
        if knowledge_domain.operation_tag_ids:
            knowledge.operation_tags.set(knowledge_domain.operation_tag_ids)
        
        return knowledge
    
    def update_from_domain(
        self,
        knowledge_orm: Knowledge,
        knowledge_domain: KnowledgeDomain
    ) -> Knowledge:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            knowledge_orm: Django Model 实例
            knowledge_domain: 知识文档领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        return KnowledgeMapper.update_orm_from_domain(knowledge_orm, knowledge_domain)


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
