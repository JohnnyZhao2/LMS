"""
任务领域模型

Domain Model 层，包含纯业务逻辑，不依赖 Django 框架。
"""
from dataclasses import dataclass, field
from typing import Optional, List
from datetime import datetime
from enum import Enum
from decimal import Decimal


class TaskAssignmentStatus(Enum):
    """任务分配状态枚举"""
    IN_PROGRESS = 'IN_PROGRESS'
    COMPLETED = 'COMPLETED'
    OVERDUE = 'OVERDUE'


@dataclass
class TaskDomain:
    """
    任务领域模型
    
    这是纯业务对象，不依赖 Django ORM。
    包含任务的核心业务属性和行为。
    """
    # 标识信息
    id: Optional[int] = None
    
    # 基本信息
    title: str = ''
    description: str = ''
    deadline: datetime = None
    
    # 状态信息
    is_closed: bool = False
    closed_at: Optional[datetime] = None
    
    # 关联信息（ID 列表）
    knowledge_ids: List[int] = field(default_factory=list)
    quiz_ids: List[int] = field(default_factory=list)
    assignee_ids: List[int] = field(default_factory=list)
    
    # 元数据
    created_by_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """初始化后验证"""
        self.validate()
    
    def validate(self) -> None:
        """
        验证任务数据
        
        Raises:
            ValueError: 如果数据验证失败
        """
        if not self.title.strip():
            raise ValueError('任务标题不能为空')
        
        if not self.deadline:
            raise ValueError('截止时间不能为空')
        
        if not self.assignee_ids:
            raise ValueError('任务必须至少分配一个学员')
    
    def is_closed_status(self) -> bool:
        """
        检查任务是否已结束（手动关闭或超过截止时间）
        
        Args:
            current_time: 当前时间（可选，用于测试）
            
        Returns:
            True 如果任务已结束
        """
        if self.is_closed:
            return True
        # 注意：这里需要传入当前时间，因为 Domain Model 不应该依赖外部时间
        # 实际使用时，应该从外部传入当前时间
        return False
    
    def can_be_closed(self) -> bool:
        """
        检查任务是否可以关闭
        
        Returns:
            True 如果可以关闭
        """
        return not self.is_closed
    
    def close(self, closed_at: datetime) -> None:
        """
        关闭任务
        
        Args:
            closed_at: 关闭时间
            
        Raises:
            ValueError: 如果任务已经关闭
        """
        if self.is_closed:
            raise ValueError('任务已经结束')
        
        self.is_closed = True
        self.closed_at = closed_at
    
    def has_resources(self) -> bool:
        """
        检查任务是否有关联的资源（知识或试卷）
        
        Returns:
            True 如果有关联资源
        """
        return len(self.knowledge_ids) > 0 or len(self.quiz_ids) > 0
    
    def validate_resources(self) -> None:
        """
        验证任务资源
        
        Raises:
            ValueError: 如果验证失败
        """
        if not self.has_resources():
            raise ValueError('任务必须至少包含一个知识文档或试卷')


@dataclass
class TaskAssignmentDomain:
    """
    任务分配领域模型
    
    记录任务分配给每个学员的状态和进度。
    """
    # 标识信息
    id: Optional[int] = None
    
    # 关联信息
    task_id: int = None
    assignee_id: int = None
    
    # 状态信息
    status: TaskAssignmentStatus = TaskAssignmentStatus.IN_PROGRESS
    completed_at: Optional[datetime] = None
    score: Optional[Decimal] = None
    
    # 元数据
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """初始化后验证"""
        self.validate()
    
    def validate(self) -> None:
        """
        验证任务分配数据
        
        Raises:
            ValueError: 如果数据验证失败
        """
        if not self.task_id:
            raise ValueError('任务ID不能为空')
        
        if not self.assignee_id:
            raise ValueError('学员ID不能为空')
    
    def is_completed(self) -> bool:
        """
        检查是否已完成
        
        Returns:
            True 如果已完成
        """
        return self.status == TaskAssignmentStatus.COMPLETED
    
    def is_overdue(self, current_time: datetime, task_deadline: datetime) -> bool:
        """
        检查是否已逾期
        
        Args:
            current_time: 当前时间
            task_deadline: 任务截止时间
            
        Returns:
            True 如果已逾期
        """
        if self.is_completed():
            return False
        return current_time > task_deadline
    
    def can_mark_completed(self) -> bool:
        """
        检查是否可以标记为已完成
        
        Returns:
            True 如果可以标记为已完成
        """
        return self.status != TaskAssignmentStatus.COMPLETED
    
    def mark_completed(self, completed_at: datetime, score: Optional[Decimal] = None) -> None:
        """
        标记为已完成
        
        Args:
            completed_at: 完成时间
            score: 可选的成绩
            
        Raises:
            ValueError: 如果已经完成
        """
        if not self.can_mark_completed():
            raise ValueError('任务分配已经完成')
        
        self.status = TaskAssignmentStatus.COMPLETED
        self.completed_at = completed_at
        if score is not None:
            self.score = score
    
    def mark_overdue(self) -> None:
        """
        标记为已逾期
        
        Raises:
            ValueError: 如果已经完成
        """
        if self.is_completed():
            raise ValueError('已完成的任务不能标记为逾期')
        
        self.status = TaskAssignmentStatus.OVERDUE
