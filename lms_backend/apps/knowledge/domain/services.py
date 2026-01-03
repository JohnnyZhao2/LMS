"""
知识文档领域服务

Domain Service 层，处理跨实体的业务逻辑。
"""
from typing import Optional
from datetime import datetime

from .models import KnowledgeDomain, KnowledgeStatus, KnowledgeType


class KnowledgeDomainService:
    """
    知识文档领域服务
    
    处理知识文档相关的领域逻辑，如版本管理、发布流程等。
    """
    
    @staticmethod
    def calculate_next_version_number(
        current_version_number: int,
        existing_versions: list[int]
    ) -> int:
        """
        计算下一个版本号
        
        Args:
            current_version_number: 当前版本号
            existing_versions: 已存在的版本号列表
            
        Returns:
            下一个版本号
        """
        if not existing_versions:
            return 1
        
        max_version = max(existing_versions)
        return max_version + 1
    
    @staticmethod
    def can_create_new_version(
        knowledge: KnowledgeDomain,
        existing_versions: list[int]
    ) -> bool:
        """
        检查是否可以创建新版本
        
        Args:
            knowledge: 知识文档领域模型
            existing_versions: 已存在的版本号列表
            
        Returns:
            True 如果可以创建新版本
        """
        if not knowledge.is_published():
            return False
        
        # 检查是否已有草稿版本
        # 这个逻辑可能需要从 Repository 层获取信息
        return True
    
    @staticmethod
    def validate_for_publish(knowledge: KnowledgeDomain) -> None:
        """
        验证知识文档是否可以发布
        
        Args:
            knowledge: 知识文档领域模型
            
        Raises:
            ValueError: 如果验证失败
        """
        if not knowledge.can_publish():
            raise ValueError('知识文档不符合发布条件')
    
    @staticmethod
    def create_draft_from_published(
        published: KnowledgeDomain,
        new_version_number: int,
        created_by_id: int
    ) -> KnowledgeDomain:
        """
        从已发布版本创建草稿
        
        Args:
            published: 已发布的知识文档
            new_version_number: 新版本号
            created_by_id: 创建者 ID
            
        Returns:
            新的草稿版本
            
        Raises:
            ValueError: 如果源版本不是已发布状态
        """
        if not published.is_published():
            raise ValueError('只能基于已发布版本创建草稿')
        
        return published.clone_as_draft(new_version_number, created_by_id)
    
    @staticmethod
    def publish_knowledge(
        knowledge: KnowledgeDomain,
        published_at: datetime,
        updated_by_id: int
    ) -> KnowledgeDomain:
        """
        发布知识文档
        
        Args:
            knowledge: 知识文档领域模型
            published_at: 发布时间
            updated_by_id: 更新者 ID
            
        Returns:
            更新后的知识文档
            
        Raises:
            ValueError: 如果无法发布
        """
        if knowledge.is_published():
            raise ValueError('知识文档已是发布状态')
        
        KnowledgeDomainService.validate_for_publish(knowledge)
        
        knowledge.mark_as_published(published_at)
        knowledge.updated_by_id = updated_by_id
        
        return knowledge
    
    @staticmethod
    def unpublish_knowledge(
        knowledge: KnowledgeDomain,
        updated_by_id: int,
        is_referenced: bool = False
    ) -> KnowledgeDomain:
        """
        取消发布知识文档
        
        Args:
            knowledge: 知识文档领域模型
            updated_by_id: 更新者 ID
            is_referenced: 是否被引用
            
        Returns:
            更新后的知识文档
            
        Raises:
            ValueError: 如果无法取消发布
        """
        if knowledge.is_draft():
            raise ValueError('知识文档已是草稿状态')
        
        if is_referenced:
            raise ValueError('该知识文档已被任务引用，无法取消发布')
        
        knowledge.mark_as_draft()
        knowledge.updated_by_id = updated_by_id
        
        return knowledge
