"""
试卷领域模型映射器

负责在 Django Model 和 Domain Model 之间进行转换。
"""
from typing import Optional, List

from .models import QuizDomain, QuizStatus, QuizType
from ..models import Quiz


class QuizMapper:
    """试卷映射器"""
    
    @staticmethod
    def to_domain(quiz: Quiz) -> QuizDomain:
        """
        将 Django Model 转换为 Domain Model
        
        Args:
            quiz: Django Quiz 模型
            
        Returns:
            QuizDomain 领域模型
        """
        # 获取题目 ID 列表
        question_ids = list(quiz.questions.values_list('id', flat=True))
        
        return QuizDomain(
            id=quiz.id,
            resource_uuid=quiz.resource_uuid,
            version_number=quiz.version_number,
            title=quiz.title,
            description=quiz.description,
            quiz_type=QuizType(quiz.quiz_type),
            status=QuizStatus(quiz.status),
            duration=quiz.duration,
            pass_score=quiz.pass_score,
            question_ids=question_ids,
            source_version_id=quiz.source_version_id if quiz.source_version else None,
            published_at=quiz.published_at,
            is_current=quiz.is_current,
            created_by_id=quiz.created_by_id if quiz.created_by else None,
            updated_by_id=quiz.updated_by_id if quiz.updated_by else None,
            created_at=quiz.created_at,
            updated_at=quiz.updated_at,
        )
    
    @staticmethod
    def to_orm_data(quiz_domain: QuizDomain) -> dict:
        """
        将 Domain Model 转换为 Django Model 数据字典
        
        Args:
            quiz_domain: QuizDomain 领域模型
            
        Returns:
            用于创建/更新 Django Model 的数据字典
        """
        data = {
            'title': quiz_domain.title,
            'description': quiz_domain.description,
            'quiz_type': quiz_domain.quiz_type.value,
            'status': quiz_domain.status.value,
            'duration': quiz_domain.duration,
            'pass_score': quiz_domain.pass_score,
            'resource_uuid': quiz_domain.resource_uuid,
            'version_number': quiz_domain.version_number,
            'published_at': quiz_domain.published_at,
            'is_current': quiz_domain.is_current,
        }
        
        # 添加可选字段
        if quiz_domain.source_version_id:
            data['source_version_id'] = quiz_domain.source_version_id
        if quiz_domain.created_by_id:
            data['created_by_id'] = quiz_domain.created_by_id
        if quiz_domain.updated_by_id:
            data['updated_by_id'] = quiz_domain.updated_by_id
        
        return data
    
    @staticmethod
    def update_orm_from_domain(
        quiz_orm: Quiz,
        quiz_domain: QuizDomain
    ) -> Quiz:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            quiz_orm: Django Quiz 模型实例
            quiz_domain: QuizDomain 领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        data = QuizMapper.to_orm_data(quiz_domain)
        
        # 更新字段
        for key, value in data.items():
            if hasattr(quiz_orm, key):
                setattr(quiz_orm, key, value)
        
        # 更新题目关系（如果需要）
        # 注意：题目关系的更新应该在 Service 层处理，这里只更新基本字段
        
        return quiz_orm
