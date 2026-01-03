"""
抽查记录仓储实现

负责所有抽查记录相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet

from core.base_repository import BaseRepository
from .models import SpotCheck


class SpotCheckRepository(BaseRepository[SpotCheck]):
    """抽查记录仓储"""
    
    model = SpotCheck
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[SpotCheck]:
        """
        根据 ID 获取抽查记录
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            抽查记录对象或 None
        """
        qs = self.model.objects.select_related(
            'student',
            'checker',
            'student__department'
        )
        
        if not include_deleted:
            qs = qs.filter(**self._get_active_filters())
        
        return qs.filter(pk=pk).first()
    
    def get_for_checker(
        self,
        checker_id: int,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ) -> QuerySet[SpotCheck]:
        """
        获取抽查人创建的抽查记录列表
        
        Args:
            checker_id: 抽查人 ID
            student_id: 可选的学生 ID（用于筛选）
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            checker_id=checker_id
        ).select_related(
            'student',
            'checker',
            'student__department'
        )
        
        if student_id:
            qs = qs.filter(student_id=student_id)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def get_for_student(
        self,
        student_id: int,
        ordering: str = '-checked_at'
    ) -> QuerySet[SpotCheck]:
        """
        获取学生的抽查记录列表
        
        Args:
            student_id: 学生 ID
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            student_id=student_id
        ).select_related(
            'student',
            'checker',
            'student__department'
        )
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def get_for_mentor_mentees(
        self,
        mentor_id: int,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ) -> QuerySet[SpotCheck]:
        """
        获取导师名下学员的抽查记录列表
        
        Args:
            mentor_id: 导师 ID
            student_id: 可选的学生 ID（用于筛选）
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        from apps.users.models import User
        
        qs = self.model.objects.filter(
            student__mentor_id=mentor_id
        ).select_related(
            'student',
            'checker',
            'student__department'
        )
        
        if student_id:
            qs = qs.filter(student_id=student_id)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def get_for_department(
        self,
        department_id: int,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ) -> QuerySet[SpotCheck]:
        """
        获取部门内学员的抽查记录列表
        
        Args:
            department_id: 部门 ID
            student_id: 可选的学生 ID（用于筛选）
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            student__department_id=department_id
        ).select_related(
            'student',
            'checker',
            'student__department'
        )
        
        if student_id:
            qs = qs.filter(student_id=student_id)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def get_all_for_admin(
        self,
        student_id: Optional[int] = None,
        ordering: str = '-checked_at'
    ) -> QuerySet[SpotCheck]:
        """
        获取所有抽查记录（管理员专用）
        
        Args:
            student_id: 可选的学生 ID（用于筛选）
            ordering: 排序字段
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.all().select_related(
            'student',
            'checker',
            'student__department'
        )
        
        if student_id:
            qs = qs.filter(student_id=student_id)
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs
    
    def _get_active_filters(self) -> dict:
        """获取活动记录的过滤条件（如果有软删除）"""
        # SpotCheck 模型当前没有软删除字段，返回空字典
        return {}