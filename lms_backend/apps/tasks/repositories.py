"""
任务相关仓储实现

负责所有任务相关的数据访问操作。
"""
from typing import Optional, List
from django.db.models import QuerySet, Q
from django.utils import timezone

from core.base_repository import BaseRepository
from .models import (
    Task,
    TaskAssignment,
    TaskKnowledge,
    TaskQuiz,
    KnowledgeLearningProgress,
)
from .domain.models import TaskDomain, TaskAssignmentDomain
from .domain.mappers import TaskMapper, TaskAssignmentMapper


class TaskRepository(BaseRepository[Task]):
    """任务仓储"""
    
    model = Task
    
    def get_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[Task]:
        """
        根据 ID 获取任务（Django Model）
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            任务对象或 None
        """
        qs = self.model.objects.select_related(
            'created_by'
        ).prefetch_related(
            'task_knowledge__knowledge',
            'task_quizzes__quiz',
            'assignments__assignee'
        )
        
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        
        return qs.filter(pk=pk).first()
    
    def get_domain_by_id(
        self,
        pk: int,
        include_deleted: bool = False
    ) -> Optional[TaskDomain]:
        """
        根据 ID 获取任务（Domain Model）
        
        Args:
            pk: 主键
            include_deleted: 是否包含已删除的记录
            
        Returns:
            任务领域模型或 None
        """
        task = self.get_by_id(pk, include_deleted)
        if task:
            return TaskMapper.to_domain(task)
        return None
    
    def create_from_domain(
        self,
        task_domain: TaskDomain
    ) -> Task:
        """
        从 Domain Model 创建 Django Model
        
        Args:
            task_domain: 任务领域模型
            
        Returns:
            创建的 Django Model 实例
        """
        data = TaskMapper.to_orm_data(task_domain)
        task = self.model.objects.create(**data)
        
        # 设置关联关系
        if task_domain.knowledge_ids:
            for order, knowledge_id in enumerate(task_domain.knowledge_ids, start=1):
                from .models import TaskKnowledge
                TaskKnowledge.objects.create(
                    task=task,
                    knowledge_id=knowledge_id,
                    order=order
                )
        
        if task_domain.quiz_ids:
            for order, quiz_id in enumerate(task_domain.quiz_ids, start=1):
                from .models import TaskQuiz
                TaskQuiz.objects.create(
                    task=task,
                    quiz_id=quiz_id,
                    order=order
                )
        
        return task
    
    def update_from_domain(
        self,
        task_orm: Task,
        task_domain: TaskDomain
    ) -> Task:
        """
        使用 Domain Model 更新 Django Model
        
        Args:
            task_orm: Django Model 实例
            task_domain: 任务领域模型
            
        Returns:
            更新后的 Django Model 实例
        """
        data = TaskMapper.to_orm_data(task_domain)
        
        # 更新字段
        for key, value in data.items():
            if hasattr(task_orm, key):
                setattr(task_orm, key, value)
        
        task_orm.save()
        
        # 更新关联关系（如果需要）
        # 注意：这里可能需要根据业务需求决定是否更新关联关系
        
        return task_orm
    
    def get_queryset_for_user(
        self,
        user,
        include_deleted: bool = False
    ) -> QuerySet[Task]:
        """
        获取用户可访问的任务查询集
        
        Args:
            user: 用户对象
            include_deleted: 是否包含已删除的记录
            
        Returns:
            QuerySet
        """
        from apps.users.permissions import get_current_role
        
        current_role = get_current_role(user)
        qs = self.model.objects.select_related('created_by')
        
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        
        if current_role == 'ADMIN':
            return qs
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            return qs.filter(created_by=user)
        else:
            # Student: only assigned tasks
            assigned_task_ids = TaskAssignment.objects.filter(
                assignee=user
            ).values_list('task_id', flat=True)
            return qs.filter(id__in=assigned_task_ids)
    
    def get_all(
        self,
        filters: dict = None,
        ordering: str = '-created_at',
        include_deleted: bool = False
    ) -> QuerySet[Task]:
        """
        获取所有任务
        
        Args:
            filters: 过滤条件
            ordering: 排序字段
            include_deleted: 是否包含已删除的记录
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.select_related('created_by')
        
        if not include_deleted:
            qs = qs.filter(is_deleted=False)
        
        if filters:
            if filters.get('created_by_id'):
                qs = qs.filter(created_by_id=filters['created_by_id'])
            if filters.get('is_closed') is not None:
                qs = qs.filter(is_closed=filters['is_closed'])
        
        if ordering:
            qs = qs.order_by(ordering)
        
        return qs


class TaskAssignmentRepository(BaseRepository[TaskAssignment]):
    """任务分配仓储"""
    
    model = TaskAssignment
    
    def get_by_id(
        self,
        pk: int
    ) -> Optional[TaskAssignment]:
        """
        根据 ID 获取任务分配（Django Model）
        
        Args:
            pk: 主键
            
        Returns:
            任务分配对象或 None
        """
        return self.model.objects.select_related(
            'task',
            'task__created_by',
            'assignee'
        ).prefetch_related(
            'task__task_knowledge__knowledge',
            'task__task_quizzes__quiz',
            'knowledge_progress__task_knowledge__knowledge'
        ).filter(pk=pk).first()
    
    def get_domain_by_id(
        self,
        pk: int
    ) -> Optional[TaskAssignmentDomain]:
        """
        根据 ID 获取任务分配（Domain Model）
        
        Args:
            pk: 主键
            
        Returns:
            任务分配领域模型或 None
        """
        assignment = self.get_by_id(pk)
        if assignment:
            return TaskAssignmentMapper.to_domain(assignment)
        return None
    
    def update_from_domain(
        self,
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
        return TaskAssignmentMapper.update_orm_from_domain(assignment_orm, assignment_domain)
    
    def get_student_assignment(
        self,
        task_id: int,
        user_id: int
    ) -> Optional[TaskAssignment]:
        """
        获取学员的任务分配
        
        Args:
            task_id: 任务 ID
            user_id: 学员用户 ID
            
        Returns:
            任务分配对象或 None
        """
        return self.model.objects.select_related(
            'task',
            'task__created_by',
            'assignee'
        ).prefetch_related(
            'task__task_knowledge__knowledge',
            'task__task_quizzes__quiz',
            'knowledge_progress__task_knowledge__knowledge'
        ).filter(
            task_id=task_id,
            assignee_id=user_id,
            task__is_deleted=False
        ).first()
    
    def get_student_assignments(
        self,
        user_id: int,
        status: str = None,
        search: str = None
    ) -> QuerySet[TaskAssignment]:
        """
        获取学员的所有任务分配
        
        Args:
            user_id: 学员用户 ID
            status: 状态过滤（可选）
            search: 搜索关键词（可选）
            
        Returns:
            QuerySet
        """
        qs = self.model.objects.filter(
            assignee_id=user_id,
            task__is_deleted=False
        ).select_related(
            'task',
            'task__created_by',
            'assignee'
        ).prefetch_related(
            'task__task_knowledge',
            'task__task_quizzes',
            'knowledge_progress'
        )
        
        if status:
            qs = qs.filter(status=status)
        
        if search:
            qs = qs.filter(task__title__icontains=search)
        
        return qs.order_by('-created_at')
    
    def get_by_task(self, task_id: int) -> QuerySet[TaskAssignment]:
        """
        获取任务的所有分配记录
        
        Args:
            task_id: 任务 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            task_id=task_id
        ).select_related('assignee').prefetch_related('knowledge_progress')
    
    def create_assignment(
        self,
        task_id: int,
        assignee_id: int
    ) -> TaskAssignment:
        """
        创建任务分配
        
        Args:
            task_id: 任务 ID
            assignee_id: 学员用户 ID
            
        Returns:
            创建的任务分配对象
        """
        return self.model.objects.create(
            task_id=task_id,
            assignee_id=assignee_id,
            status='IN_PROGRESS'
        )
    
    def update_status(
        self,
        assignment: TaskAssignment,
        status: str,
        score: Optional[float] = None
    ) -> TaskAssignment:
        """
        更新任务分配状态
        
        Args:
            assignment: 任务分配对象
            status: 新状态
            score: 可选的成绩
            
        Returns:
            更新后的任务分配对象
        """
        update_fields = ['status']
        assignment.status = status
        
        if status == 'COMPLETED':
            assignment.completed_at = timezone.now()
            update_fields.append('completed_at')
            if score is not None:
                assignment.score = score
                update_fields.append('score')
        
        assignment.save(update_fields=update_fields)
        return assignment


class TaskKnowledgeRepository(BaseRepository[TaskKnowledge]):
    """任务知识关联仓储"""
    
    model = TaskKnowledge
    
    def get_by_task(self, task_id: int) -> QuerySet[TaskKnowledge]:
        """
        获取任务的所有知识关联
        
        Args:
            task_id: 任务 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            task_id=task_id
        ).select_related('knowledge', 'task').order_by('order')
    
    def create_association(
        self,
        task_id: int,
        knowledge_id: int,
        order: int,
        resource_uuid: str = None,
        version_number: int = None
    ) -> TaskKnowledge:
        """
        创建任务知识关联
        
        Args:
            task_id: 任务 ID
            knowledge_id: 知识文档 ID
            order: 顺序
            resource_uuid: 资源 UUID（可选）
            version_number: 版本号（可选）
            
        Returns:
            创建的任务知识关联对象
        """
        data = {
            'task_id': task_id,
            'knowledge_id': knowledge_id,
            'order': order,
        }
        if resource_uuid:
            data['resource_uuid'] = resource_uuid
        if version_number:
            data['version_number'] = version_number
        
        return self.model.objects.create(**data)
    
    def delete_by_task(self, task_id: int) -> None:
        """
        删除任务的所有知识关联
        
        Args:
            task_id: 任务 ID
        """
        self.model.objects.filter(task_id=task_id).delete()
    
    def get_existing_ids(self, task_id: int) -> List[int]:
        """
        获取任务的所有知识文档 ID 列表（按顺序）
        
        Args:
            task_id: 任务 ID
            
        Returns:
            知识文档 ID 列表
        """
        return list(
            self.model.objects.filter(task_id=task_id)
            .order_by('order')
            .values_list('knowledge_id', flat=True)
        )


class TaskQuizRepository(BaseRepository[TaskQuiz]):
    """任务试卷关联仓储"""
    
    model = TaskQuiz
    
    def get_by_task(self, task_id: int) -> QuerySet[TaskQuiz]:
        """
        获取任务的所有试卷关联
        
        Args:
            task_id: 任务 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            task_id=task_id
        ).select_related('quiz', 'task').order_by('order')
    
    def create_association(
        self,
        task_id: int,
        quiz_id: int,
        order: int,
        resource_uuid: str = None,
        version_number: int = None
    ) -> TaskQuiz:
        """
        创建任务试卷关联
        
        Args:
            task_id: 任务 ID
            quiz_id: 试卷 ID
            order: 顺序
            resource_uuid: 资源 UUID（可选）
            version_number: 版本号（可选）
            
        Returns:
            创建的任务试卷关联对象
        """
        data = {
            'task_id': task_id,
            'quiz_id': quiz_id,
            'order': order,
        }
        if resource_uuid:
            data['resource_uuid'] = resource_uuid
        if version_number:
            data['version_number'] = version_number
        
        return self.model.objects.create(**data)
    
    def delete_by_task(self, task_id: int) -> None:
        """
        删除任务的所有试卷关联
        
        Args:
            task_id: 任务 ID
        """
        self.model.objects.filter(task_id=task_id).delete()
    
    def get_existing_ids(self, task_id: int) -> List[int]:
        """
        获取任务的所有试卷 ID 列表（按顺序）
        
        Args:
            task_id: 任务 ID
            
        Returns:
            试卷 ID 列表
        """
        return list(
            self.model.objects.filter(task_id=task_id)
            .order_by('order')
            .values_list('quiz_id', flat=True)
        )


class KnowledgeLearningProgressRepository(BaseRepository[KnowledgeLearningProgress]):
    """知识学习进度仓储"""
    
    model = KnowledgeLearningProgress
    
    def get_by_assignment(
        self,
        assignment_id: int
    ) -> QuerySet[KnowledgeLearningProgress]:
        """
        获取任务分配的所有知识学习进度
        
        Args:
            assignment_id: 任务分配 ID
            
        Returns:
            QuerySet
        """
        return self.model.objects.filter(
            assignment_id=assignment_id
        ).select_related(
            'task_knowledge',
            'task_knowledge__knowledge'
        ).order_by('task_knowledge__order')
    
    def get_by_assignment_and_knowledge(
        self,
        assignment_id: int,
        task_knowledge_id: int
    ) -> Optional[KnowledgeLearningProgress]:
        """
        获取指定任务分配和知识的学习进度
        
        Args:
            assignment_id: 任务分配 ID
            task_knowledge_id: 任务知识关联 ID
            
        Returns:
            学习进度对象或 None
        """
        return self.model.objects.filter(
            assignment_id=assignment_id,
            task_knowledge_id=task_knowledge_id
        ).select_related('task_knowledge__knowledge').first()
    
    def create_progress(
        self,
        assignment_id: int,
        task_knowledge_id: int
    ) -> KnowledgeLearningProgress:
        """
        创建学习进度记录
        
        Args:
            assignment_id: 任务分配 ID
            task_knowledge_id: 任务知识关联 ID
            
        Returns:
            创建的学习进度对象
        """
        return self.model.objects.create(
            assignment_id=assignment_id,
            task_knowledge_id=task_knowledge_id,
            is_completed=False
        )
    
    def get_or_create_progress(
        self,
        assignment_id: int,
        task_knowledge_id: int
    ) -> tuple[KnowledgeLearningProgress, bool]:
        """
        获取或创建学习进度记录
        
        Args:
            assignment_id: 任务分配 ID
            task_knowledge_id: 任务知识关联 ID
            
        Returns:
            (学习进度对象, 是否创建)
        """
        return self.model.objects.get_or_create(
            assignment_id=assignment_id,
            task_knowledge_id=task_knowledge_id,
            defaults={'is_completed': False}
        )
    
    def mark_completed(
        self,
        progress: KnowledgeLearningProgress
    ) -> KnowledgeLearningProgress:
        """
        标记学习进度为已完成
        
        Args:
            progress: 学习进度对象
            
        Returns:
            更新后的学习进度对象
        """
        if not progress.is_completed:
            progress.is_completed = True
            progress.completed_at = timezone.now()
            progress.save(update_fields=['is_completed', 'completed_at'])
        return progress
