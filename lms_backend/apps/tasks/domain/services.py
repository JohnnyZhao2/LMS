"""
任务领域服务

Domain Service 层，处理跨实体的业务逻辑。
"""
from typing import Optional
from datetime import datetime
from decimal import Decimal

from .models import TaskDomain, TaskAssignmentDomain, TaskAssignmentStatus


class TaskDomainService:
    """
    任务领域服务
    
    处理任务相关的领域逻辑，如任务关闭、分配管理等。
    """
    
    @staticmethod
    def can_close_task(
        task: TaskDomain,
        current_time: datetime
    ) -> bool:
        """
        检查任务是否可以关闭
        
        Args:
            task: 任务领域模型
            current_time: 当前时间
            
        Returns:
            True 如果可以关闭
        """
        return task.can_be_closed()
    
    @staticmethod
    def close_task(
        task: TaskDomain,
        closed_at: datetime
    ) -> TaskDomain:
        """
        关闭任务
        
        Args:
            task: 任务领域模型
            closed_at: 关闭时间
            
        Returns:
            更新后的任务领域模型
            
        Raises:
            ValueError: 如果无法关闭
        """
        task.close(closed_at)
        return task
    
    @staticmethod
    def is_task_closed(
        task: TaskDomain,
        current_time: datetime
    ) -> bool:
        """
        检查任务是否已结束（手动关闭或超过截止时间）
        
        Args:
            task: 任务领域模型
            current_time: 当前时间
            
        Returns:
            True 如果任务已结束
        """
        if task.is_closed:
            return True
        return current_time > task.deadline
    
    @staticmethod
    def validate_task_for_creation(task: TaskDomain) -> None:
        """
        验证任务是否可以创建
        
        Args:
            task: 任务领域模型
            
        Raises:
            ValueError: 如果验证失败
        """
        task.validate()
        task.validate_resources()
    
    @staticmethod
    def can_mark_assignment_completed(
        assignment: TaskAssignmentDomain
    ) -> bool:
        """
        检查任务分配是否可以标记为已完成
        
        Args:
            assignment: 任务分配领域模型
            
        Returns:
            True 如果可以标记为已完成
        """
        return assignment.can_mark_completed()
    
    @staticmethod
    def mark_assignment_completed(
        assignment: TaskAssignmentDomain,
        completed_at: datetime,
        score: Optional[Decimal] = None
    ) -> TaskAssignmentDomain:
        """
        标记任务分配为已完成
        
        Args:
            assignment: 任务分配领域模型
            completed_at: 完成时间
            score: 可选的成绩
            
        Returns:
            更新后的任务分配领域模型
            
        Raises:
            ValueError: 如果无法标记为已完成
        """
        assignment.mark_completed(completed_at, score)
        return assignment
    
    @staticmethod
    def check_and_update_overdue(
        assignment: TaskAssignmentDomain,
        current_time: datetime,
        task_deadline: datetime
    ) -> TaskAssignmentDomain:
        """
        检查并更新任务分配的逾期状态
        
        Args:
            assignment: 任务分配领域模型
            current_time: 当前时间
            task_deadline: 任务截止时间
            
        Returns:
            更新后的任务分配领域模型
        """
        if assignment.is_overdue(current_time, task_deadline):
            if assignment.status != TaskAssignmentStatus.OVERDUE:
                assignment.mark_overdue()
        
        return assignment
