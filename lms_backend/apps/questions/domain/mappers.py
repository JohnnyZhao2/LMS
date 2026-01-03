"""
题目领域模型映射器

负责在 Django Model 和 Domain Model 之间进行转换。
"""
from typing import Optional
from django.contrib.contenttypes.models import ContentType

from .models import QuestionDomain, QuestionStatus, QuestionType, Difficulty
from ..models import Question


class QuestionMapper:
    """题目映射器"""
    
    @staticmethod
    def to_domain(question: Question) -> QuestionDomain:
        """
        将 Django Model 转换为 Domain Model
        
        Args:
            question: Django Question 模型
            
        Returns:
            QuestionDomain 领域模型
        """
        # 获取条线类型 ID
        line_type_id = None
        if question.line_type:
            line_type_id = question.line_type.id
        
        return QuestionDomain(
            id=question.id,
            resource_uuid=question.resource_uuid,
            version_number=question.version_number,
            content=question.content,
            question_type=QuestionType(question.question_type),
            status=QuestionStatus(question.status),
            options=question.options or [],
            answer=question.answer,
            explanation=question.explanation,
            score=question.score,
            difficulty=Difficulty(question.difficulty),
            line_type_id=line_type_id,
            source_version_id=question.source_version_id if question.source_version else None,
            published_at=question.published_at,
            is_current=question.is_current,
            created_by_id=question.created_by_id if question.created_by else None,
            updated_by_id=question.updated_by_id if question.updated_by else None,
            created_at=question.created_at,
            updated_at=question.updated_at,
        )
    
    @staticmethod
    def to_orm_data(question_domain: QuestionDomain) -> dict:
        """
        将 Domain Model 转换为 Django Model 数据字典
        
        Args:
            question_domain: QuestionDomain 领域模型
            
        Returns:
            用于创建/更新 Django Model 的数据字典
        """
        data = {
            'content': question_domain.content,
            'question_type': question_domain.question_type.value,
            'status': question_domain.status.value,
            'options': question_domain.options,
            'answer': question_domain.answer,
            'explanation': question_domain.explanation,
            'score': question_domain.score,
            'difficulty': question_domain.difficulty.value,
            'resource_uuid': question_domain.resource_uuid,
            'version_number': question_domain.version_number,
            'published_at': question_domain.published_at,
            'is_current': question_domain.is_current,
        }
        
        # 添加可选字段
        if question_domain.source_version_id:
            data['source_version_id'] = question_domain.source_version_id
        if question_domain.created_by_id:
            data['created_by_id'] = question_domain.created_by_id
        if question_domain.updated_by_id:
            data['updated_by_id'] = question_domain.updated_by_id
        
        return data
    
    @staticmethod
    def update_orm_from_domain(
        question_orm: Question,
        question_domain: QuestionDomain
    ) -> Question:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            question_orm: Django Question 模型实例
            question_domain: QuestionDomain 领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        data = QuestionMapper.to_orm_data(question_domain)
        
        # 更新字段
        for key, value in data.items():
            if hasattr(question_orm, key):
                setattr(question_orm, key, value)
        
        # 更新条线类型关系
        if question_domain.line_type_id:
            from ..models import Question
            from apps.knowledge.models import Tag, ResourceLineType
            line_type = Tag.objects.get(id=question_domain.line_type_id)
            question_orm.set_line_type(line_type)
        
        return question_orm
