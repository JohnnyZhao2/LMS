"""
题目领域服务

Domain Service 层，处理跨实体的业务逻辑。
"""
from typing import Optional
from datetime import datetime

from .models import QuestionDomain, QuestionStatus


class QuestionDomainService:
    """
    题目领域服务
    
    处理题目相关的领域逻辑，如版本管理、发布流程等。
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
        question: QuestionDomain,
        existing_versions: list[int]
    ) -> bool:
        """
        检查是否可以创建新版本
        
        Args:
            question: 题目领域模型
            existing_versions: 已存在的版本号列表
            
        Returns:
            True 如果可以创建新版本
        """
        if not question.is_published():
            return False
        
        # 检查是否已有草稿版本
        # 这个逻辑可能需要从 Repository 层获取信息
        return True
    
    @staticmethod
    def validate_for_publish(question: QuestionDomain) -> None:
        """
        验证题目是否可以发布
        
        Args:
            question: 题目领域模型
            
        Raises:
            ValueError: 如果验证失败
        """
        if not question.can_publish():
            raise ValueError('题目不符合发布条件')
    
    @staticmethod
    def create_draft_from_published(
        published: QuestionDomain,
        new_version_number: int,
        created_by_id: int
    ) -> QuestionDomain:
        """
        从已发布版本创建草稿
        
        Args:
            published: 已发布的题目
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
    def publish_question(
        question: QuestionDomain,
        published_at: datetime,
        updated_by_id: int
    ) -> QuestionDomain:
        """
        发布题目
        
        Args:
            question: 题目领域模型
            published_at: 发布时间
            updated_by_id: 更新者 ID
            
        Returns:
            更新后的题目
            
        Raises:
            ValueError: 如果无法发布
        """
        if question.is_published():
            raise ValueError('题目已是发布状态')
        
        QuestionDomainService.validate_for_publish(question)
        
        question.mark_as_published(published_at)
        question.updated_by_id = updated_by_id
        
        return question
    
    @staticmethod
    def unpublish_question(
        question: QuestionDomain,
        updated_by_id: int,
        is_referenced: bool = False
    ) -> QuestionDomain:
        """
        取消发布题目
        
        Args:
            question: 题目领域模型
            updated_by_id: 更新者 ID
            is_referenced: 是否被引用
            
        Returns:
            更新后的题目
            
        Raises:
            ValueError: 如果无法取消发布
        """
        if question.is_draft():
            raise ValueError('题目已是草稿状态')
        
        if is_referenced:
            raise ValueError('该题目已被试卷引用，无法取消发布')
        
        question.mark_as_draft()
        question.updated_by_id = updated_by_id
        
        return question
