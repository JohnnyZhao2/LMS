"""
任务领域模型映射器

负责在 Django Model 和 Domain Model 之间进行转换。
"""
from typing import Optional
from decimal import Decimal

from .models import TaskDomain, TaskAssignmentDomain, TaskAssignmentStatus
from ..models import Task, TaskAssignment


class TaskMapper:
    """任务映射器"""
    
    @staticmethod
    def to_domain(task: Task) -> TaskDomain:
        """
        将 Django Model 转换为 Domain Model
        
        Args:
            task: Django Task 模型
            
        Returns:
            TaskDomain 领域模型
        """
        # 获取关联的知识文档和试卷 ID 列表
        knowledge_ids = list(task.task_knowledge.values_list('knowledge_id', flat=True))
        quiz_ids = list(task.task_quizzes.values_list('quiz_id', flat=True))
        assignee_ids = list(task.assignments.values_list('assignee_id', flat=True))
        
        return TaskDomain(
            id=task.id,
            title=task.title,
            description=task.description,
            deadline=task.deadline,
            is_closed=task.is_closed,
            closed_at=task.closed_at,
            knowledge_ids=knowledge_ids,
            quiz_ids=quiz_ids,
            assignee_ids=assignee_ids,
            created_by_id=task.created_by_id if task.created_by else None,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )
    
    @staticmethod
    def to_orm_data(task_domain: TaskDomain) -> dict:
        """
        将 Domain Model 转换为 Django Model 数据字典
        
        Args:
            task_domain: TaskDomain 领域模型
            
        Returns:
            用于创建/更新 Django Model 的数据字典
        """
        data = {
            'title': task_domain.title,
            'description': task_domain.description,
            'deadline': task_domain.deadline,
            'is_closed': task_domain.is_closed,
            'closed_at': task_domain.closed_at,
        }
        
        # 添加可选字段
        if task_domain.created_by_id:
            data['created_by_id'] = task_domain.created_by_id
        
        return data


class TaskAssignmentMapper:
    """任务分配映射器"""
    
    @staticmethod
    def to_domain(assignment: TaskAssignment) -> TaskAssignmentDomain:
        """
        将 Django Model 转换为 Domain Model
        
        Args:
            assignment: Django TaskAssignment 模型
            
        Returns:
            TaskAssignmentDomain 领域模型
        """
        return TaskAssignmentDomain(
            id=assignment.id,
            task_id=assignment.task_id,
            assignee_id=assignment.assignee_id,
            status=TaskAssignmentStatus(assignment.status),
            completed_at=assignment.completed_at,
            score=Decimal(str(assignment.score)) if assignment.score else None,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )
    
    @staticmethod
    def to_orm_data(assignment_domain: TaskAssignmentDomain) -> dict:
        """
        将 Domain Model 转换为 Django Model 数据字典
        
        Args:
            assignment_domain: TaskAssignmentDomain 领域模型
            
        Returns:
            用于创建/更新 Django Model 的数据字典
        """
        data = {
            'task_id': assignment_domain.task_id,
            'assignee_id': assignment_domain.assignee_id,
            'status': assignment_domain.status.value,
            'completed_at': assignment_domain.completed_at,
            'score': assignment_domain.score,
        }
        
        return data
    
    @staticmethod
    def update_orm_from_domain(
        assignment_orm: TaskAssignment,
        assignment_domain: TaskAssignmentDomain
    ) -> TaskAssignment:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            assignment_orm: Django Model 实例
            assignment_domain: TaskAssignmentDomain 领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        assignment_orm.status = assignment_domain.status.value
        assignment_orm.completed_at = assignment_domain.completed_at
        if assignment_domain.score is not None:
            assignment_orm.score = assignment_domain.score
        
        return assignment_orm
