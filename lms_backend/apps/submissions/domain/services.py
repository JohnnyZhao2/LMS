"""
提交领域服务

Domain Service 层，处理跨实体的业务逻辑。
"""
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from .models import SubmissionDomain, AnswerDomain, SubmissionStatus


class SubmissionDomainService:
    """
    提交领域服务
    
    处理提交相关的领域逻辑，如状态管理、评分流程等。
    """
    
    @staticmethod
    def can_submit(submission: SubmissionDomain) -> bool:
        """
        检查是否可以提交
        
        Args:
            submission: 提交领域模型
            
        Returns:
            True 如果可以提交
        """
        return submission.is_in_progress()
    
    @staticmethod
    def submit(
        submission: SubmissionDomain,
        submitted_at: datetime,
        has_subjective_questions: bool
    ) -> SubmissionDomain:
        """
        提交答卷
        
        Args:
            submission: 提交领域模型
            submitted_at: 提交时间
            has_subjective_questions: 是否包含主观题
            
        Returns:
            更新后的提交
            
        Raises:
            ValueError: 如果无法提交
        """
        if not SubmissionDomainService.can_submit(submission):
            raise ValueError('只能提交答题中的记录')
        
        submission.mark_as_submitted(submitted_at)
        
        # 根据是否包含主观题设置状态
        if has_subjective_questions:
            submission.mark_as_grading()
        else:
            # 纯客观题，先标记为已提交，然后直接完成
            # 注意：mark_as_graded() 需要从 GRADING 状态转换，所以我们需要直接设置状态
            submission.status = SubmissionStatus.GRADED
        
        return submission
    
    @staticmethod
    def can_complete_grading(
        submission: SubmissionDomain,
        all_subjective_graded: bool
    ) -> bool:
        """
        检查是否可以完成评分
        
        Args:
            submission: 提交领域模型
            all_subjective_graded: 是否所有主观题都已评分
            
        Returns:
            True 如果可以完成评分
        """
        if not submission.is_grading():
            return False
        
        return all_subjective_graded
    
    @staticmethod
    def complete_grading(submission: SubmissionDomain) -> SubmissionDomain:
        """
        完成评分（所有主观题评分完成后调用）
        
        Args:
            submission: 提交领域模型
            
        Returns:
            更新后的提交
            
        Raises:
            ValueError: 如果无法完成评分
        """
        if not submission.is_grading():
            raise ValueError('只能完成待评分状态的记录')
        
        submission.mark_as_graded()
        
        return submission
    
    @staticmethod
    def calculate_total_score(answers: List[AnswerDomain]) -> Decimal:
        """
        计算总分
        
        Args:
            answers: 答案列表
            
        Returns:
            总分
        """
        total = Decimal('0')
        for answer in answers:
            total += answer.obtained_score
        return total
    
    @staticmethod
    def check_all_subjective_graded(answers: List[AnswerDomain]) -> bool:
        """
        检查所有主观题是否都已评分
        
        Args:
            answers: 答案列表
            
        Returns:
            True 如果所有主观题都已评分
        """
        for answer in answers:
            # 主观题需要人工评分（graded_by_id 不为空）
            if answer.question_id and not answer.is_graded():
                return False
        return True
