"""
试卷领域模型

Domain Model 层，包含纯业务逻辑，不依赖 Django 框架。
"""
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from decimal import Decimal
import uuid


class QuizStatus(Enum):
    """试卷状态枚举"""
    DRAFT = 'DRAFT'
    PUBLISHED = 'PUBLISHED'


class QuizType(Enum):
    """试卷类型枚举"""
    PRACTICE = 'PRACTICE'
    EXAM = 'EXAM'


@dataclass
class QuizDomain:
    """
    试卷领域模型
    
    这是纯业务对象，不依赖 Django ORM。
    包含试卷的核心业务属性和行为。
    """
    # 标识信息
    id: Optional[int] = None
    resource_uuid: uuid.UUID = field(default_factory=uuid.uuid4)
    version_number: int = 1
    
    # 基本信息
    title: str = ''
    description: str = ''
    quiz_type: QuizType = QuizType.PRACTICE
    status: QuizStatus = QuizStatus.PUBLISHED
    
    # 考试相关配置（仅考试类型有效）
    duration: Optional[int] = None  # 考试时长（分钟）
    pass_score: Optional[Decimal] = None  # 及格分数
    
    # 题目关联（ID 列表）
    question_ids: List[int] = field(default_factory=list)
    
    # 版本信息
    source_version_id: Optional[int] = None
    published_at: Optional[datetime] = None
    is_current: bool = True
    
    # 元数据
    created_by_id: Optional[int] = None
    updated_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """初始化后验证"""
        self.validate()
    
    def validate(self) -> None:
        """
        验证试卷数据
        
        Raises:
            ValueError: 如果数据验证失败
        """
        if not self.title.strip():
            raise ValueError('试卷名称不能为空')
        
        # 考试类型验证
        if self.quiz_type == QuizType.EXAM:
            if self.duration is None or self.duration <= 0:
                raise ValueError('考试类型试卷必须设置有效的考试时长')
            if self.pass_score is None or self.pass_score < 0:
                raise ValueError('考试类型试卷必须设置有效的及格分数')
    
    def can_publish(self) -> bool:
        """
        检查是否可以发布
        
        Returns:
            True 如果可以发布
        """
        try:
            self.validate()
            # 试卷必须至少包含一道题目
            if not self.question_ids:
                return False
            return True
        except ValueError:
            return False
    
    def is_published(self) -> bool:
        """
        检查是否已发布
        
        Returns:
            True 如果已发布
        """
        return self.status == QuizStatus.PUBLISHED
    
    def is_draft(self) -> bool:
        """
        检查是否为草稿
        
        Returns:
            True 如果是草稿
        """
        return self.status == QuizStatus.DRAFT
    
    def mark_as_published(self, published_at: datetime) -> None:
        """
        标记为已发布
        
        Args:
            published_at: 发布时间
        """
        if not self.can_publish():
            raise ValueError('试卷不符合发布条件')
        
        self.status = QuizStatus.PUBLISHED
        self.published_at = published_at
        self.is_current = True
    
    def mark_as_draft(self) -> None:
        """标记为草稿"""
        self.status = QuizStatus.DRAFT
        self.published_at = None
        self.is_current = False
    
    def clone_as_draft(self, new_version_number: int, created_by_id: int) -> 'QuizDomain':
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
        
        return QuizDomain(
            resource_uuid=self.resource_uuid,
            version_number=new_version_number,
            title=self.title,
            description=self.description,
            quiz_type=self.quiz_type,
            status=QuizStatus.DRAFT,
            duration=self.duration,
            pass_score=self.pass_score,
            question_ids=self.question_ids.copy(),
            source_version_id=self.id,
            is_current=False,
            created_by_id=created_by_id,
            updated_by_id=created_by_id,
        )
    
    def has_questions(self) -> bool:
        """
        检查试卷是否包含题目
        
        Returns:
            True 如果包含题目
        """
        return len(self.question_ids) > 0
    
    def validate_questions(self) -> None:
        """
        验证试卷题目
        
        Raises:
            ValueError: 如果验证失败
        """
        if not self.has_questions():
            raise ValueError('试卷必须至少包含一道题目')
