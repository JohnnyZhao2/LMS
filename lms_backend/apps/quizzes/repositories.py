"""
试卷仓储实现

负责所有试卷相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q, Max
from django.db import models

from core.base_repository import BaseRepository
from .models import Quiz, QuizQuestion


class QuizRepository(BaseRepository[Quiz]):
    """试卷仓储"""
    
    model = Quiz
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Quiz]:
        """
        根据 ID 获取试卷
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            试卷对象或 None
        """
        qs = self.model.objects.select_related(
            'created_by',
            'source_version'
        ).prefetch_related(
            'quiz_questions__question'
        )
        
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        
        return qs.filter(pk=pk).first()
    
    def get_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        limit: int = None,
        offset: int = None
    ) -> QuerySet[Quiz]:
        """
        获取试卷列表
        
        Args:
            filters: 过滤条件（created_by_id）
            search: 搜索关键词（搜索标题）
            ordering: 排序字段
            limit: 限制数量
            offset: 偏移量
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            is_deleted=False,
            is_current=True
        ).select_related('created_by')
        
        # 应用过滤条件
        if filters:
            if filters.get('created_by_id'):
                qs = qs.filter(created_by_id=filters['created_by_id'])
        
        # 搜索
        if search:
            qs = qs.filter(title__icontains=search)
        
        # 排序
        if ordering:
            qs = qs.order_by(ordering)
        
        # 分页
        if limit:
            qs = qs[offset:offset+limit] if offset else qs[:limit]
        
        return qs
    
    def is_referenced_by_task(self, quiz_id: int) -> bool:
        """
        检查试卷是否被任务引用
        
        Requirements: 6.8
        Property 14: 被引用试卷删除保护
        
        Args:
            quiz_id: 试卷 ID
            
        Returns:
            True 如果被引用
        """
        try:
            from apps.tasks.models import TaskQuiz
            return TaskQuiz.objects.filter(quiz_id=quiz_id).exists()
        except ImportError:
            # tasks app 尚未实现
            return False
    
    def next_version_number(self, resource_uuid) -> int:
        """
        获取下一个版本号
        
        Args:
            resource_uuid: 资源 UUID（可选）
            
        Returns:
            下一个版本号
        """
        if not resource_uuid:
            return 1
        
        aggregate = self.model.objects.filter(
            resource_uuid=resource_uuid,
            is_deleted=False
        ).aggregate(
            max_version=Max('version_number')
        )
        max_version = aggregate['max_version'] or 0
        return max_version + 1
    
    def get_current_version(
        self,
        resource_uuid: str
    ) -> Optional[Quiz]:
        """
        获取资源的当前版本
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            当前版本或 None
        """
        return self.model.objects.filter(
            resource_uuid=resource_uuid,
            is_current=True,
            is_deleted=False
        ).select_related('created_by').first()
    
    def get_draft_for_resource(
        self,
        resource_uuid: str
    ) -> Optional[Quiz]:
        """
        获取资源的非当前版本（历史版本）
        
        Args:
            resource_uuid: 资源 UUID
            
        Returns:
            非当前版本或 None
        """
        return self.model.objects.filter(
            resource_uuid=resource_uuid,
            is_current=False,
            is_deleted=False
        ).first()
    
    def unset_current_flag_for_others(
        self,
        resource_uuid: str,
        exclude_pk: int
    ) -> None:
        """
        取消其他版本的 is_current 标志
        
        Args:
            resource_uuid: 资源 UUID
            exclude_pk: 要排除的主键（保持 is_current=True）
        """
        self.model.objects.filter(
            resource_uuid=resource_uuid
        ).exclude(pk=exclude_pk).update(is_current=False)


class QuizQuestionRepository(BaseRepository[QuizQuestion]):
    """试卷题目关联仓储"""
    
    model = QuizQuestion
    
    def get_by_quiz(
        self,
        quiz_id: int
    ) -> QuerySet[QuizQuestion]:
        """
        获取试卷的所有题目关联
        
        Args:
            quiz_id: 试卷 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            quiz_id=quiz_id
        ).select_related('question', 'quiz').order_by('order')
    
    def get_ordered_questions(
        self,
        quiz_id: int
    ) -> QuerySet[QuizQuestion]:
        """
        获取按顺序排列的题目列表
        
        Args:
            quiz_id: 试卷 ID
            
        Returns:
            QuerySet: 按 order 排序的 QuizQuestion 查询集
        """
        return self.get_by_quiz(quiz_id)
    
    def add_question(
        self,
        quiz_id: int,
        question_id: int,
        order: int = None
    ) -> QuizQuestion:
        """
        向试卷添加题目
        
        Requirements: 6.2
        
        Args:
            quiz_id: 试卷 ID
            question_id: 题目 ID
            order: 题目顺序，如果为 None 则自动追加到末尾
            
        Returns:
            QuizQuestion: 创建的关联记录
        """
        if order is None:
            # 获取当前最大顺序号
            max_order = self.model.objects.filter(
                quiz_id=quiz_id
            ).aggregate(
                max_order=Max('order')
            )['max_order']
            order = (max_order or 0) + 1
        
        return self.model.objects.create(
            quiz_id=quiz_id,
            question_id=question_id,
            order=order
        )
    
    def remove_question(
        self,
        quiz_id: int,
        question_id: int
    ) -> bool:
        """
        从试卷移除题目
        
        Args:
            quiz_id: 试卷 ID
            question_id: 题目 ID
            
        Returns:
            bool: 是否成功移除
        """
        deleted_count, _ = self.model.objects.filter(
            quiz_id=quiz_id,
            question_id=question_id
        ).delete()
        return deleted_count > 0
    
    def remove_questions(
        self,
        quiz_id: int,
        question_ids: List[int]
    ) -> int:
        """
        从试卷移除多个题目
        
        Args:
            quiz_id: 试卷 ID
            question_ids: 题目 ID 列表
            
        Returns:
            int: 删除的数量
        """
        deleted_count, _ = self.model.objects.filter(
            quiz_id=quiz_id,
            question_id__in=question_ids
        ).delete()
        return deleted_count
    
    def get_question_ids(self, quiz_id: int) -> List[int]:
        """
        获取试卷的所有题目 ID 列表（按顺序）
        
        Args:
            quiz_id: 试卷 ID
            
        Returns:
            题目 ID 列表
        """
        return list(
            self.model.objects.filter(quiz_id=quiz_id)
            .order_by('order')
            .values_list('question_id', flat=True)
        )
    
    def question_exists_in_quiz(
        self,
        quiz_id: int,
        question_id: int
    ) -> bool:
        """
        检查题目是否已在试卷中
        
        Args:
            quiz_id: 试卷 ID
            question_id: 题目 ID
            
        Returns:
            True 如果题目已在试卷中
        """
        return self.model.objects.filter(
            quiz_id=quiz_id,
            question_id=question_id
        ).exists()
