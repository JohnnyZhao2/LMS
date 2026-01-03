"""
提交领域模型映射器

负责在 Django Model 和 Domain Model 之间进行转换。
"""
from typing import Optional, List

from .models import SubmissionDomain, AnswerDomain, SubmissionStatus
from ..models import Submission, Answer


class SubmissionMapper:
    """提交映射器"""
    
    @staticmethod
    def to_domain(submission: Submission) -> SubmissionDomain:
        """
        将 Django Model 转换为 Domain Model
        
        Args:
            submission: Django Submission 模型
            
        Returns:
            SubmissionDomain 领域模型
        """
        # 获取答案 ID 列表
        answer_ids = list(submission.answers.values_list('id', flat=True))
        
        return SubmissionDomain(
            id=submission.id,
            task_assignment_id=submission.task_assignment_id,
            quiz_id=submission.quiz_id,
            user_id=submission.user_id,
            attempt_number=submission.attempt_number,
            status=SubmissionStatus(submission.status),
            total_score=submission.total_score,
            obtained_score=submission.obtained_score,
            started_at=submission.started_at,
            submitted_at=submission.submitted_at,
            remaining_seconds=submission.remaining_seconds,
            answer_ids=answer_ids,
            created_at=submission.created_at,
            updated_at=submission.updated_at,
        )
    
    @staticmethod
    def to_orm_data(submission_domain: SubmissionDomain) -> dict:
        """
        将 Domain Model 转换为 Django Model 数据字典
        
        Args:
            submission_domain: SubmissionDomain 领域模型
            
        Returns:
            用于创建/更新 Django Model 的数据字典
        """
        data = {
            'task_assignment_id': submission_domain.task_assignment_id,
            'quiz_id': submission_domain.quiz_id,
            'user_id': submission_domain.user_id,
            'attempt_number': submission_domain.attempt_number,
            'status': submission_domain.status.value,
            'total_score': submission_domain.total_score,
            'obtained_score': submission_domain.obtained_score,
            'started_at': submission_domain.started_at,
            'submitted_at': submission_domain.submitted_at,
            'remaining_seconds': submission_domain.remaining_seconds,
        }
        
        return data
    
    @staticmethod
    def update_orm_from_domain(
        submission_orm: Submission,
        submission_domain: SubmissionDomain
    ) -> Submission:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            submission_orm: Django Submission 模型实例
            submission_domain: SubmissionDomain 领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        data = SubmissionMapper.to_orm_data(submission_domain)
        
        # 更新字段
        for key, value in data.items():
            if hasattr(submission_orm, key):
                setattr(submission_orm, key, value)
        
        return submission_orm


class AnswerMapper:
    """答案映射器"""
    
    @staticmethod
    def to_domain(answer: Answer) -> AnswerDomain:
        """
        将 Django Model 转换为 Domain Model
        
        Args:
            answer: Django Answer 模型
            
        Returns:
            AnswerDomain 领域模型
        """
        return AnswerDomain(
            id=answer.id,
            submission_id=answer.submission_id,
            question_id=answer.question_id,
            user_answer=answer.user_answer,
            is_correct=answer.is_correct,
            obtained_score=answer.obtained_score,
            graded_by_id=answer.graded_by_id if answer.graded_by else None,
            graded_at=answer.graded_at,
            comment=answer.comment,
            created_at=answer.created_at,
            updated_at=answer.updated_at,
        )
    
    @staticmethod
    def to_orm_data(answer_domain: AnswerDomain) -> dict:
        """
        将 Domain Model 转换为 Django Model 数据字典
        
        Args:
            answer_domain: AnswerDomain 领域模型
            
        Returns:
            用于创建/更新 Django Model 的数据字典
        """
        data = {
            'submission_id': answer_domain.submission_id,
            'question_id': answer_domain.question_id,
            'user_answer': answer_domain.user_answer,
            'is_correct': answer_domain.is_correct,
            'obtained_score': answer_domain.obtained_score,
            'comment': answer_domain.comment,
        }
        
        # 添加可选字段
        if answer_domain.graded_by_id:
            data['graded_by_id'] = answer_domain.graded_by_id
        if answer_domain.graded_at:
            data['graded_at'] = answer_domain.graded_at
        
        return data
    
    @staticmethod
    def update_orm_from_domain(
        answer_orm: Answer,
        answer_domain: AnswerDomain
    ) -> Answer:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            answer_orm: Django Answer 模型实例
            answer_domain: AnswerDomain 领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        data = AnswerMapper.to_orm_data(answer_domain)
        
        # 更新字段
        for key, value in data.items():
            if hasattr(answer_orm, key):
                setattr(answer_orm, key, value)
        
        return answer_orm
