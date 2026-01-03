"""
知识文档领域模型映射器

负责在 Django Model 和 Domain Model 之间进行转换。
"""
from typing import Optional
from django.contrib.contenttypes.models import ContentType

from .models import KnowledgeDomain, KnowledgeStatus, KnowledgeType
from ..models import Knowledge


class KnowledgeMapper:
    """知识文档映射器"""
    
    @staticmethod
    def to_domain(knowledge: Knowledge) -> KnowledgeDomain:
        """
        将 Django Model 转换为 Domain Model
        
        Args:
            knowledge: Django Knowledge 模型
            
        Returns:
            KnowledgeDomain 领域模型
        """
        # 获取条线类型 ID
        line_type_id = None
        if knowledge.line_type:
            line_type_id = knowledge.line_type.id
        
        # 获取系统标签和操作标签 ID 列表
        system_tag_ids = list(knowledge.system_tags.values_list('id', flat=True))
        operation_tag_ids = list(knowledge.operation_tags.values_list('id', flat=True))
        
        return KnowledgeDomain(
            id=knowledge.id,
            resource_uuid=knowledge.resource_uuid,
            version_number=knowledge.version_number,
            title=knowledge.title,
            knowledge_type=KnowledgeType(knowledge.knowledge_type),
            status=KnowledgeStatus(knowledge.status),
            summary=knowledge.summary,
            fault_scenario=knowledge.fault_scenario,
            trigger_process=knowledge.trigger_process,
            solution=knowledge.solution,
            verification_plan=knowledge.verification_plan,
            recovery_plan=knowledge.recovery_plan,
            content=knowledge.content,
            line_type_id=line_type_id,
            system_tag_ids=system_tag_ids,
            operation_tag_ids=operation_tag_ids,
            source_version_id=knowledge.source_version_id,
            published_at=knowledge.published_at,
            is_current=knowledge.is_current,
            created_by_id=knowledge.created_by_id if knowledge.created_by else None,
            updated_by_id=knowledge.updated_by_id if knowledge.updated_by else None,
            created_at=knowledge.created_at,
            updated_at=knowledge.updated_at,
            view_count=knowledge.view_count,
        )
    
    @staticmethod
    def to_orm_data(knowledge_domain: KnowledgeDomain) -> dict:
        """
        将 Domain Model 转换为 Django Model 数据字典
        
        Args:
            knowledge_domain: KnowledgeDomain 领域模型
            
        Returns:
            用于创建/更新 Django Model 的数据字典
        """
        data = {
            'title': knowledge_domain.title,
            'knowledge_type': knowledge_domain.knowledge_type.value,
            'status': knowledge_domain.status.value,
            'summary': knowledge_domain.summary,
            'fault_scenario': knowledge_domain.fault_scenario,
            'trigger_process': knowledge_domain.trigger_process,
            'solution': knowledge_domain.solution,
            'verification_plan': knowledge_domain.verification_plan,
            'recovery_plan': knowledge_domain.recovery_plan,
            'content': knowledge_domain.content,
            'resource_uuid': knowledge_domain.resource_uuid,
            'version_number': knowledge_domain.version_number,
            'published_at': knowledge_domain.published_at,
            'is_current': knowledge_domain.is_current,
            'view_count': knowledge_domain.view_count,
        }
        
        # 添加可选字段
        if knowledge_domain.source_version_id:
            data['source_version_id'] = knowledge_domain.source_version_id
        if knowledge_domain.created_by_id:
            data['created_by_id'] = knowledge_domain.created_by_id
        if knowledge_domain.updated_by_id:
            data['updated_by_id'] = knowledge_domain.updated_by_id
        
        return data
    
    @staticmethod
    def update_orm_from_domain(
        knowledge_orm: Knowledge,
        knowledge_domain: KnowledgeDomain
    ) -> Knowledge:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            knowledge_orm: Django Knowledge 模型实例
            knowledge_domain: KnowledgeDomain 领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        data = KnowledgeMapper.to_orm_data(knowledge_domain)
        
        # 更新字段
        for key, value in data.items():
            if hasattr(knowledge_orm, key):
                setattr(knowledge_orm, key, value)
        
        # 更新标签关系
        if knowledge_domain.line_type_id:
            from ..models import Tag
            line_type = Tag.objects.get(id=knowledge_domain.line_type_id)
            knowledge_orm.set_line_type(line_type)
        
        if knowledge_domain.system_tag_ids is not None:
            knowledge_orm.system_tags.set(knowledge_domain.system_tag_ids)
        
        if knowledge_domain.operation_tag_ids is not None:
            knowledge_orm.operation_tags.set(knowledge_domain.operation_tag_ids)
        
        return knowledge_orm
