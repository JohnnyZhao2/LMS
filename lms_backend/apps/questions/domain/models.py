"""
题目领域模型

Domain Model 层，包含纯业务逻辑，不依赖 Django 框架。
"""
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
from decimal import Decimal
import uuid


class QuestionStatus(Enum):
    """题目状态枚举"""
    DRAFT = 'DRAFT'
    PUBLISHED = 'PUBLISHED'


class QuestionType(Enum):
    """题目类型枚举"""
    SINGLE_CHOICE = 'SINGLE_CHOICE'
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE'
    TRUE_FALSE = 'TRUE_FALSE'
    SHORT_ANSWER = 'SHORT_ANSWER'


class Difficulty(Enum):
    """难度等级枚举"""
    EASY = 'EASY'
    MEDIUM = 'MEDIUM'
    HARD = 'HARD'


@dataclass
class QuestionDomain:
    """
    题目领域模型
    
    这是纯业务对象，不依赖 Django ORM。
    包含题目的核心业务属性和行为。
    """
    # 标识信息
    id: Optional[int] = None
    resource_uuid: uuid.UUID = field(default_factory=uuid.uuid4)
    version_number: int = 1
    
    # 基本信息
    content: str = ''
    question_type: QuestionType = QuestionType.SINGLE_CHOICE
    status: QuestionStatus = QuestionStatus.PUBLISHED
    
    # 选项（用于选择题）
    options: List[Dict[str, str]] = field(default_factory=list)
    
    # 答案
    answer: Any = None  # 可以是 str, list, 或 str（根据题目类型）
    
    # 解析
    explanation: str = ''
    
    # 分值和难度
    score: Decimal = Decimal('1.0')
    difficulty: Difficulty = Difficulty.MEDIUM
    
    # 版本信息
    source_version_id: Optional[int] = None
    published_at: Optional[datetime] = None
    is_current: bool = True
    
    # 标签信息
    line_type_id: Optional[int] = None
    
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
        验证题目数据
        
        Raises:
            ValueError: 如果数据验证失败
        """
        if not self.content.strip():
            raise ValueError('题目内容不能为空')
        
        # 选择题验证
        if self.question_type in [QuestionType.SINGLE_CHOICE, QuestionType.MULTIPLE_CHOICE]:
            if not self.options:
                raise ValueError('选择题必须设置选项')
            
            # 获取所有选项的 key
            option_keys = [opt.get('key') for opt in self.options if isinstance(opt, dict)]
            
            # 验证答案在选项范围内
            if self.question_type == QuestionType.SINGLE_CHOICE:
                if not isinstance(self.answer, str):
                    raise ValueError('单选题答案必须是字符串')
                if self.answer not in option_keys:
                    raise ValueError('单选题答案必须是有效的选项')
            else:  # MULTIPLE_CHOICE
                if not isinstance(self.answer, list):
                    raise ValueError('多选题答案必须是列表')
                for ans in self.answer:
                    if ans not in option_keys:
                        raise ValueError(f'多选题答案 {ans} 不是有效的选项')
        
        # 判断题验证
        elif self.question_type == QuestionType.TRUE_FALSE:
            if self.answer not in ['TRUE', 'FALSE']:
                raise ValueError('判断题答案必须是 TRUE 或 FALSE')
        
        # 简答题验证
        elif self.question_type == QuestionType.SHORT_ANSWER:
            if not isinstance(self.answer, str):
                raise ValueError('简答题答案必须是字符串')
    
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
        return self.status == QuestionStatus.PUBLISHED
    
    def is_draft(self) -> bool:
        """
        检查是否为草稿
        
        Returns:
            True 如果是草稿
        """
        return self.status == QuestionStatus.DRAFT
    
    def mark_as_published(self, published_at: datetime) -> None:
        """
        标记为已发布
        
        Args:
            published_at: 发布时间
        """
        if not self.can_publish():
            raise ValueError('题目不符合发布条件')
        
        self.status = QuestionStatus.PUBLISHED
        self.published_at = published_at
        self.is_current = True
    
    def mark_as_draft(self) -> None:
        """标记为草稿"""
        self.status = QuestionStatus.DRAFT
        self.published_at = None
        self.is_current = False
    
    def clone_as_draft(self, new_version_number: int, created_by_id: int) -> 'QuestionDomain':
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
        
        return QuestionDomain(
            resource_uuid=self.resource_uuid,
            version_number=new_version_number,
            content=self.content,
            question_type=self.question_type,
            status=QuestionStatus.DRAFT,
            options=self.options.copy() if self.options else [],
            answer=self.answer,
            explanation=self.explanation,
            score=self.score,
            difficulty=self.difficulty,
            source_version_id=self.id,
            is_current=False,
            line_type_id=self.line_type_id,
            created_by_id=created_by_id,
            updated_by_id=created_by_id,
        )
    
    @property
    def is_objective(self) -> bool:
        """
        是否为客观题（可自动评分）
        
        客观题包括: 单选题、多选题、判断题
        """
        return self.question_type in [
            QuestionType.SINGLE_CHOICE,
            QuestionType.MULTIPLE_CHOICE,
            QuestionType.TRUE_FALSE
        ]
    
    @property
    def is_subjective(self) -> bool:
        """是否为主观题（需人工评分）"""
        return self.question_type == QuestionType.SHORT_ANSWER
    
    def check_answer(self, user_answer: Any) -> tuple[bool, Decimal]:
        """
        检查用户答案是否正确（仅适用于客观题）
        
        Args:
            user_answer: 用户提交的答案
            
        Returns:
            tuple: (is_correct: bool, obtained_score: Decimal)
        """
        if self.is_subjective:
            # 主观题无法自动评分
            return False, Decimal('0')
        
        if self.question_type == QuestionType.SINGLE_CHOICE:
            is_correct = user_answer == self.answer
        elif self.question_type == QuestionType.MULTIPLE_CHOICE:
            # 多选题需要完全匹配
            if isinstance(user_answer, list):
                is_correct = set(user_answer) == set(self.answer)
            else:
                is_correct = False
        elif self.question_type == QuestionType.TRUE_FALSE:
            is_correct = user_answer == self.answer
        else:
            is_correct = False
        
        obtained_score = self.score if is_correct else Decimal('0')
        return is_correct, obtained_score
