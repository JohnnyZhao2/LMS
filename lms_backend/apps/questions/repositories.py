"""
题目相关仓储实现
负责所有题目相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q
from django.contrib.contenttypes.models import ContentType
from core.base_repository import BaseRepository
from .models import Question
class QuestionRepository(BaseRepository[Question]):
    """题目仓储"""
    model = Question
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Question]:
        """
        根据 ID 获取题目
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
        Returns:
            题目对象或 None
        """
        qs = self.model.objects.select_related('created_by')
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        return qs.filter(pk=pk).first()
    def get_all_with_filters(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at'
    ) -> QuerySet[Question]:
        """
        获取所有题目（支持过滤、搜索、排序）
        Args:
            filters: 过滤条件
            search: 搜索关键词
            ordering: 排序字段
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            is_deleted=False,
            is_current=True
        ).select_related('created_by')
        qs = self._apply_filters(qs, filters, search)
        # 排序
        if ordering:
            qs = qs.order_by(ordering)
        return qs.distinct()
    def is_referenced_by_quiz(self, question_id: int) -> bool:
        """
        检查题目是否被试卷引用
        Args:
            question_id: 题目 ID
        Returns:
            True 如果被引用
        """
        try:
            from apps.quizzes.models import QuizQuestion
            # 只检查未被软删除的试卷的引用
            return QuizQuestion.objects.filter(
                question_id=question_id,
                quiz__is_deleted=False
            ).exists()
        except ImportError:
            # quizzes app 尚未实现
            return False
    def _apply_filters(
        self,
        qs: QuerySet[Question],
        filters: dict = None,
        search: str = None
    ) -> QuerySet[Question]:
        """
        应用过滤和搜索条件
        Args:
            qs: 查询集
            filters: 过滤条件
            search: 搜索关键词
        Returns:
            QuerySet
        """
        # 应用过滤条件
        if filters:
            if filters.get('question_type'):
                qs = qs.filter(question_type=filters['question_type'])
            if filters.get('created_by_id'):
                qs = qs.filter(created_by_id=filters['created_by_id'])
            if filters.get('is_current') is not None:
                qs = qs.filter(is_current=filters['is_current'])
            # 过滤条线类型（通过ResourceLineType关系表）
            if filters.get('line_type_id'):
                from apps.knowledge.models import ResourceLineType
                question_content_type = ContentType.objects.get_for_model(self.model)
                qs = qs.filter(
                    id__in=ResourceLineType.objects.filter(
                        content_type=question_content_type,
                        line_type_id=filters['line_type_id']
                    ).values_list('object_id', flat=True)
                )
        # 搜索
        if search:
            qs = qs.filter(content__icontains=search)
        return qs
    def get_published_list(
        self,
        filters: dict = None,
        search: str = None,
        ordering: str = '-created_at',
        limit: int = None,
        offset: int = None
    ) -> QuerySet[Question]:
        """
        获取当前版本的题目列表
        Args:
            filters: 过滤条件
            search: 搜索关键词
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
        qs = self._apply_filters(qs, filters, search)
        # 排序
        if ordering:
            qs = qs.order_by(ordering)
        # 分页
        if limit:
            qs = qs[offset:offset+limit] if offset else qs[:limit]
        return qs.distinct()
