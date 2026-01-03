"""
提交领域模型

Domain Model 层，包含纯业务逻辑，不依赖 Django 框架。
"""
from dataclasses import dataclass, field
from typing import Optional, List, Any
from datetime import datetime
from enum import Enum
from decimal import Decimal


class SubmissionStatus(Enum):
    """提交状态枚举"""
    IN_PROGRESS = 'IN_PROGRESS'
    SUBMITTED = 'SUBMITTED'
    GRADING = 'GRADING'
    GRADED = 'GRADED'


@dataclass
class SubmissionDomain:
    """
    答题记录领域模型
    
    这是纯业务对象，不依赖 Django ORM。
    包含答题记录的核心业务属性和行为。
    """
    # 标识信息
    id: Optional[int] = None
    
    # 关联信息
    task_assignment_id: int = None
    quiz_id: int = None
    user_id: int = None
    
    # 答题次数（练习任务可多次提交）
    attempt_number: int = 1
    
    # 状态
    status: SubmissionStatus = SubmissionStatus.IN_PROGRESS
    
    # 分数
    total_score: Decimal = Decimal('0')
    obtained_score: Optional[Decimal] = None
    
    # 时间记录
    started_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    
    # 考试专用：剩余时间（秒）
    remaining_seconds: Optional[int] = None
    
    # 答案列表（AnswerDomain ID 列表）
    answer_ids: List[int] = field(default_factory=list)
    
    # 元数据
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """初始化后验证"""
        self.validate()
    
    def validate(self) -> None:
        """
        验证提交数据
        
        Raises:
            ValueError: 如果数据验证失败
        """
        if not self.task_assignment_id:
            raise ValueError('任务分配ID不能为空')
        
        if not self.quiz_id:
            raise ValueError('试卷ID不能为空')
        
        if not self.user_id:
            raise ValueError('用户ID不能为空')
    
    def is_in_progress(self) -> bool:
        """
        检查是否答题中
        
        Returns:
            True 如果答题中
        """
        return self.status == SubmissionStatus.IN_PROGRESS
    
    def is_submitted(self) -> bool:
        """
        检查是否已提交
        
        Returns:
            True 如果已提交
        """
        return self.status == SubmissionStatus.SUBMITTED
    
    def is_grading(self) -> bool:
        """
        检查是否待评分
        
        Returns:
            True 如果待评分
        """
        return self.status == SubmissionStatus.GRADING
    
    def is_graded(self) -> bool:
        """
        检查是否已评分
        
        Returns:
            True 如果已评分
        """
        return self.status == SubmissionStatus.GRADED
    
    def can_submit(self) -> bool:
        """
        检查是否可以提交
        
        Returns:
            True 如果可以提交
        """
        return self.is_in_progress()
    
    def can_be_graded(self) -> bool:
        """
        检查是否可以评分
        
        Returns:
            True 如果可以评分
        """
        return self.is_grading()
    
    def mark_as_submitted(self, submitted_at: datetime) -> None:
        """
        标记为已提交
        
        Args:
            submitted_at: 提交时间
        """
        if not self.can_submit():
            raise ValueError('只能提交答题中的记录')
        
        self.status = SubmissionStatus.SUBMITTED
        self.submitted_at = submitted_at
    
    def mark_as_grading(self) -> None:
        """标记为待评分"""
        if not self.is_submitted():
            raise ValueError('只能将已提交的记录标记为待评分')
        
        self.status = SubmissionStatus.GRADING
    
    def mark_as_graded(self) -> None:
        """
        标记为已评分
        
        可以从 GRADING 或 SUBMITTED 状态转换（纯客观题的情况）
        """
        if not (self.is_grading() or self.is_submitted()):
            raise ValueError('只能将待评分或已提交的记录标记为已评分')
        
        self.status = SubmissionStatus.GRADED
    
    def update_score(self, score: Decimal) -> None:
        """
        更新得分
        
        Args:
            score: 得分
        """
        self.obtained_score = score


@dataclass
class AnswerDomain:
    """
    答案记录领域模型
    
    记录学员对每道题目的作答情况。
    """
    # 标识信息
    id: Optional[int] = None
    
    # 关联信息
    submission_id: int = None
    question_id: int = None
    
    # 用户答案
    user_answer: Any = None  # 可以是 str, list, 或 str（根据题目类型）
    
    # 是否正确（客观题自动判断，主观题由评分人判断）
    is_correct: Optional[bool] = None
    
    # 得分
    obtained_score: Decimal = Decimal('0')
    
    # 评分信息（主观题）
    graded_by_id: Optional[int] = None
    graded_at: Optional[datetime] = None
    comment: str = ''
    
    # 元数据
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def __post_init__(self):
        """初始化后验证"""
        self.validate()
    
    def validate(self) -> None:
        """
        验证答案数据
        
        Raises:
            ValueError: 如果数据验证失败
        """
        if not self.submission_id:
            raise ValueError('提交ID不能为空')
        
        if not self.question_id:
            raise ValueError('题目ID不能为空')
    
    def is_graded(self) -> bool:
        """
        检查是否已评分
        
        Returns:
            True 如果已评分
        """
        # 客观题自动评分，主观题需要人工评分
        return self.graded_by_id is not None or self.is_correct is not None
    
    def can_be_graded(self, max_score: Decimal) -> bool:
        """
        检查是否可以评分（主观题）
        
        Args:
            max_score: 题目满分
            
        Returns:
            True 如果可以评分
        """
        # 主观题需要人工评分
        return self.graded_by_id is None
    
    def grade(
        self,
        grader_id: int,
        score: Decimal,
        comment: str = '',
        graded_at: Optional[datetime] = None
    ) -> None:
        """
        人工评分（主观题）
        
        Args:
            grader_id: 评分人 ID
            score: 给定分数
            comment: 评语
            graded_at: 评分时间（可选）
            
        Raises:
            ValueError: 如果评分失败
        """
        if score < 0:
            raise ValueError('分数不能为负数')
        
        self.graded_by_id = grader_id
        self.obtained_score = score
        self.comment = comment
        self.graded_at = graded_at
