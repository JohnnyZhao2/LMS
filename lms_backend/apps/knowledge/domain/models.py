"""
知识文档领域模型

Domain Model 层，包含纯业务逻辑，不依赖 Django 框架。
"""
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


class KnowledgeStatus(Enum):
    """知识文档状态枚举"""
    DRAFT = 'DRAFT'
    PUBLISHED = 'PUBLISHED'


class KnowledgeType(Enum):
    """知识类型枚举"""
    EMERGENCY = 'EMERGENCY'
    OTHER = 'OTHER'


@dataclass
class KnowledgeDomain:
    """
    知识文档领域模型
    
    这是纯业务对象，不依赖 Django ORM。
    包含知识文档的核心业务属性和行为。
    """
    # 标识信息
    id: Optional[int] = None
    resource_uuid: uuid.UUID = field(default_factory=uuid.uuid4)
    version_number: int = 1
    
    # 基本信息
    title: str = ''
    knowledge_type: KnowledgeType = KnowledgeType.OTHER
    status: KnowledgeStatus = KnowledgeStatus.DRAFT
    summary: str = ''
    
    # 内容字段
    # 应急类知识的结构化字段
    fault_scenario: str = ''
    trigger_process: str = ''
    solution: str = ''
    verification_plan: str = ''
    recovery_plan: str = ''
    
    # 其他类型知识的正文内容
    content: str = ''
    
    # 标签信息
    line_type_id: Optional[int] = None
    system_tag_ids: List[int] = field(default_factory=list)
    operation_tag_ids: List[int] = field(default_factory=list)
    
    # 版本信息
    source_version_id: Optional[int] = None
    published_at: Optional[datetime] = None
    is_current: bool = False
    
    # 元数据
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    view_count: int = 0
    
    def __post_init__(self):
        """初始化后验证"""
        self.validate()
    
    def validate(self) -> None:
        """
        验证知识文档数据
        
        Raises:
            ValueError: 如果数据验证失败
        """
        if not self.title.strip():
            raise ValueError('标题不能为空')
        
        if self.knowledge_type == KnowledgeType.EMERGENCY:
            structured_fields = [
                self.fault_scenario,
                self.trigger_process,
                self.solution,
                self.verification_plan,
                self.recovery_plan,
            ]
            if not any(field.strip() for field in structured_fields):
                raise ValueError('应急类知识必须至少填写一个结构化字段')
        elif self.knowledge_type == KnowledgeType.OTHER:
            if not self.content.strip():
                raise ValueError('其他类型知识必须填写正文内容')
    
    def can_publish(self) -> bool:
        """
        检查是否可以发布
        
        Returns:
            True 如果可以发布
        """
        try:
            self.validate()
            return True
        except ValueError:
            return False
    
    def is_published(self) -> bool:
        """
        检查是否已发布
        
        Returns:
            True 如果已发布
        """
        return self.status == KnowledgeStatus.PUBLISHED
    
    def is_draft(self) -> bool:
        """
        检查是否为草稿
        
        Returns:
            True 如果是草稿
        """
        return self.status == KnowledgeStatus.DRAFT
    
    def mark_as_published(self, published_at: datetime) -> None:
        """
        标记为已发布
        
        Args:
            published_at: 发布时间
        """
        if not self.can_publish():
            raise ValueError('知识文档不符合发布条件')
        
        self.status = KnowledgeStatus.PUBLISHED
        self.published_at = published_at
        self.is_current = True
    
    def mark_as_draft(self) -> None:
        """标记为草稿"""
        self.status = KnowledgeStatus.DRAFT
        self.published_at = None
        self.is_current = False
    
    def clone_as_draft(self, new_version_number: int, created_by_id: int) -> 'KnowledgeDomain':
        """
        基于当前版本创建新的草稿版本
        
        Args:
            new_version_number: 新版本号
            created_by_id: 创建者 ID
            
        Returns:
            新的草稿版本
        """
        if not self.is_published():
            raise ValueError('只能基于已发布版本创建草稿')
        
        return KnowledgeDomain(
            resource_uuid=self.resource_uuid,
            version_number=new_version_number,
            title=self.title,
            knowledge_type=self.knowledge_type,
            status=KnowledgeStatus.DRAFT,
            summary=self.summary,
            fault_scenario=self.fault_scenario,
            trigger_process=self.trigger_process,
            solution=self.solution,
            verification_plan=self.verification_plan,
            recovery_plan=self.recovery_plan,
            content=self.content,
            line_type_id=self.line_type_id,
            system_tag_ids=self.system_tag_ids.copy(),
            operation_tag_ids=self.operation_tag_ids.copy(),
            source_version_id=self.id,
            is_current=False,
            created_by_id=created_by_id,
            updated_by_id=created_by_id,
        )
    
    def increment_view_count(self) -> int:
        """
        增加阅读次数
        
        Returns:
            更新后的阅读次数
        """
        self.view_count += 1
        return self.view_count
    
    @property
    def content_preview(self) -> str:
        """
        生成内容预览（用于列表显示）
        
        Returns:
            内容预览文本
        """
        # 优先使用手动填写的概要
        if self.summary and self.summary.strip():
            return self.summary.strip()
        
        if self.knowledge_type == KnowledgeType.EMERGENCY:
            # 应急类知识：优先显示故障场景，如果没有则显示解决方案
            preview_text = self.fault_scenario.strip() or self.solution.strip()
            if not preview_text:
                preview_text = (
                    self.trigger_process.strip() or
                    self.verification_plan.strip() or
                    self.recovery_plan.strip()
                )
        else:
            # 其他类型知识：从 content 字段提取
            preview_text = self.content.strip()
        
        # 限制长度并去除换行
        if preview_text:
            preview_text = preview_text.replace('\n', ' ').replace('\r', ' ')
            if len(preview_text) > 150:
                return preview_text[:150] + '...'
            return preview_text
        
        return ''
