"""
Task management services.

Provides business logic for:
- Task CRUD operations
- Task assignment management
- Knowledge learning progress tracking
- Task completion logic

This service layer separates business logic from Views and Serializers,
improving code reusability and testability.
"""
from typing import List, Optional, Dict, Any, Tuple
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from core.exceptions import BusinessError, ErrorCodes
from core.base_service import BaseService
from apps.users.models import User
from apps.users.permissions import (
    get_current_role,
    get_accessible_students,
    validate_students_in_scope,
)
from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz, KnowledgeLearningProgress
from .repositories import (
    TaskRepository,
    TaskAssignmentRepository,
    TaskKnowledgeRepository,
    TaskQuizRepository,
    KnowledgeLearningProgressRepository,
)
from .domain.models import TaskDomain, TaskAssignmentDomain
from .domain.services import TaskDomainService
from .domain.mappers import TaskMapper, TaskAssignmentMapper


class TaskService(BaseService):
    """
    Service for task management operations.
    
    Handles:
    - Task creation with knowledge/quiz associations
    - Task updates and deletions
    - Task closing logic
    - Permission checks for task operations
    """
    
    def __init__(self):
        self.task_repository = TaskRepository()
        self.task_assignment_repository = TaskAssignmentRepository()
        self.task_knowledge_repository = TaskKnowledgeRepository()
        self.task_quiz_repository = TaskQuizRepository()
        self.domain_service = TaskDomainService()
    
    def get_task_queryset_for_user(self, user: User) -> QuerySet:
        """
        Get task queryset based on user's role.
        
        Args:
            user: The requesting user
            
        Returns:
            QuerySet of tasks accessible to the user
        """
        return self.task_repository.get_queryset_for_user(user, include_deleted=False)
    
    def get_task_by_id(self, pk: int, include_deleted: bool = False) -> Task:
        """
        Get a task by ID.
        
        Args:
            pk: Task primary key
            include_deleted: Whether to include soft-deleted tasks
            
        Returns:
            Task instance
            
        Raises:
            BusinessError: If task not found
        """
        task = self.task_repository.get_by_id(pk, include_deleted=include_deleted)
        self.validate_not_none(task, f'任务 {pk} 不存在')
        return task
    
    def check_task_read_permission(self, task: Task, user: User) -> bool:
        """
        Check if user has permission to read a task.
        
        Args:
            task: The task to check
            user: The user requesting access
            
        Returns:
            True if permitted
            
        Raises:
            BusinessError: If permission denied
        """
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            return True
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            if task.created_by != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此任务'
                )
            return True
        else:
            # Student
            if not task.assignments.filter(assignee=user).exists():
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权访问此任务'
                )
            return True
    
    def check_task_edit_permission(self, task: Task, user: User) -> bool:
        """
        Check if user has permission to edit a task.
        
        Args:
            task: The task to check
            user: The user requesting access
            
        Returns:
            True if permitted
            
        Raises:
            BusinessError: If permission denied
        """
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            return True
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            if task.created_by != user:
                raise BusinessError(
                    code=ErrorCodes.PERMISSION_DENIED,
                    message='无权操作此任务'
                )
            return True
        else:
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='只有管理员和导师可以操作任务'
            )
    
    @staticmethod
    def is_task_closed(task: Task) -> bool:
        """
        Check if a task is closed (manually closed or past deadline).
        
        Args:
            task: The task to check
            
        Returns:
            True if task is closed
        """
        # 使用 Domain Service 检查
        task_domain = TaskMapper.to_domain(task)
        return TaskDomainService.is_task_closed(task_domain, timezone.now())
    
    @transaction.atomic
    def create_task(
        title: str,
        description: str,
        deadline,
        created_by: User,
        knowledge_ids: List[int] = None,
        quiz_ids: List[int] = None,
        assignee_ids: List[int] = None,
    ) -> Task:
        """
        Create a new task with associations.
        
        Args:
            title: Task title
            description: Task description
            deadline: Task deadline
            created_by: User creating the task
            knowledge_ids: List of knowledge document IDs
            quiz_ids: List of quiz IDs
            assignee_ids: List of assignee user IDs
            
        Returns:
            Created Task instance
        """
        knowledge_ids = knowledge_ids or []
        quiz_ids = quiz_ids or []
        assignee_ids = assignee_ids or []
        
        # Create task
        task = self.task_repository.create(
            title=title,
            description=description,
            deadline=deadline,
            created_by=created_by
        )
        
        # Create knowledge associations
        if knowledge_ids:
            self._create_knowledge_associations(task, knowledge_ids)
        
        # Create quiz associations
        if quiz_ids:
            self._create_quiz_associations(task, quiz_ids)
        
        # Create assignments
        for assignee_id in assignee_ids:
            self.task_assignment_repository.create_assignment(
                task_id=task.id,
                assignee_id=assignee_id
            )
        
        return task
    
    def _create_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        """Create TaskKnowledge associations for a task."""
        knowledge_queryset = Knowledge.objects.filter(
            id__in=knowledge_ids,
            is_deleted=False,
            status='PUBLISHED'
        ).select_related('created_by').prefetch_related('system_tags', 'operation_tags')
        knowledge_map = {k.id: k for k in knowledge_queryset}
        
        for order, knowledge_id in enumerate(knowledge_ids, start=1):
            knowledge = knowledge_map.get(knowledge_id)
            if not knowledge:
                continue
            self.task_knowledge_repository.create_association(
                task_id=task.id,
                knowledge_id=knowledge_id,
                order=order,
                resource_uuid=knowledge.resource_uuid,
                version_number=knowledge.version_number
            )
    
    def _create_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        """Create TaskQuiz associations for a task."""
        quiz_queryset = Quiz.objects.filter(
            id__in=quiz_ids,
            is_deleted=False,
            status='PUBLISHED'
        )
        quiz_map = {q.id: q for q in quiz_queryset}
        
        for order, quiz_id in enumerate(quiz_ids, start=1):
            quiz = quiz_map.get(quiz_id)
            if not quiz:
                continue
            self.task_quiz_repository.create_association(
                task_id=task.id,
                quiz_id=quiz_id,
                order=order,
                resource_uuid=quiz.resource_uuid,
                version_number=quiz.version_number
            )
    
    @transaction.atomic
    def update_task(
        task: Task,
        knowledge_ids: List[int] = None,
        quiz_ids: List[int] = None,
        assignee_ids: List[int] = None,
        **kwargs
    ) -> Task:
        """
        Update a task and its associations.
        
        Args:
            task: Task to update
            knowledge_ids: New list of knowledge IDs (None to skip update)
            quiz_ids: New list of quiz IDs (None to skip update)
            assignee_ids: New list of assignee IDs (None to skip update)
            **kwargs: Other task fields to update
            
        Returns:
            Updated Task instance
        """
        # Update basic fields
        task = self.task_repository.update(task, **kwargs)
        
        # Update knowledge associations
        if knowledge_ids is not None:
            self._update_knowledge_associations(task, knowledge_ids)
        
        # Update quiz associations
        if quiz_ids is not None:
            self._update_quiz_associations(task, quiz_ids)
        
        # Update assignments
        if assignee_ids is not None:
            self._update_assignments(task, assignee_ids)
        
        return task
    
    def _update_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        """Update TaskKnowledge associations for a task."""
        existing_ids = self.task_knowledge_repository.get_existing_ids(task.id)
        if existing_ids != list(knowledge_ids):
            self.task_knowledge_repository.delete_by_task(task.id)
            if knowledge_ids:
                self._create_knowledge_associations(task, knowledge_ids)
    
    def _update_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        """Update TaskQuiz associations for a task."""
        existing_ids = self.task_quiz_repository.get_existing_ids(task.id)
        if existing_ids != list(quiz_ids):
            self.task_quiz_repository.delete_by_task(task.id)
            if quiz_ids:
                self._create_quiz_associations(task, quiz_ids)
    
    def _update_assignments(self, task: Task, assignee_ids: List[int]) -> None:
        """Update TaskAssignment records for a task."""
        existing_assignments = self.task_assignment_repository.get_by_task(task.id)
        existing_ids = set(existing_assignments.values_list('assignee_id', flat=True))
        new_ids = set(assignee_ids)
        
        # Remove assignments
        to_remove = existing_ids - new_ids
        if to_remove:
            for assignment in existing_assignments.filter(assignee_id__in=to_remove):
                self.task_assignment_repository.delete(assignment, soft=False)
        
        # Add new assignments
        to_add = new_ids - existing_ids
        for assignee_id in to_add:
            self.task_assignment_repository.create_assignment(
                task_id=task.id,
                assignee_id=assignee_id
            )
    
    def delete_task(self, task: Task) -> None:
        """
        Soft delete a task.
        
        Args:
            task: Task to delete
        """
        self.task_repository.delete(task, soft=True)
    
    def close_task(self, task: Task) -> Task:
        """
        Force close a task (使用 Domain Service).
        
        Args:
            task: Task to close
            
        Returns:
            Closed Task instance
            
        Raises:
            BusinessError: If task is already closed
        """
        # 转换为 Domain Model
        task_domain = TaskMapper.to_domain(task)
        
        # 使用 Domain Service 关闭任务
        try:
            task_domain = self.domain_service.close_task(
                task_domain,
                closed_at=timezone.now()
            )
        except ValueError as e:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message=str(e)
            )
        
        # 更新 Django Model
        task = self.task_repository.update_from_domain(task, task_domain)
        task.save()
        
        # 将未完成的分配记录标记为已逾期
        task.assignments.filter(
            status='IN_PROGRESS'
        ).update(status='OVERDUE')
        
        task.refresh_from_db()
        return task
    
    @staticmethod
    def validate_knowledge_ids(knowledge_ids: List[int]) -> Tuple[bool, List[int], List[int]]:
        """
        Validate knowledge document IDs.
        
        Args:
            knowledge_ids: List of knowledge IDs to validate
            
        Returns:
            Tuple of (is_valid, draft_ids, not_found_ids)
        """
        if not knowledge_ids:
            return True, [], []
        
        published = Knowledge.objects.filter(
            id__in=knowledge_ids,
            is_deleted=False,
            status='PUBLISHED'
        )
        published_ids = set(published.values_list('id', flat=True))
        invalid_ids = set(knowledge_ids) - published_ids
        
        if not invalid_ids:
            return True, [], []
        
        draft = Knowledge.objects.filter(
            id__in=invalid_ids,
            is_deleted=False,
            status='DRAFT'
        )
        draft_ids = list(draft.values_list('id', flat=True))
        not_found_ids = list(invalid_ids - set(draft_ids))
        
        return False, draft_ids, not_found_ids
    
    @staticmethod
    def validate_quiz_ids(quiz_ids: List[int]) -> Tuple[bool, List[int]]:
        """
        Validate quiz IDs.
        
        Args:
            quiz_ids: List of quiz IDs to validate
            
        Returns:
            Tuple of (is_valid, invalid_ids)
        """
        if not quiz_ids:
            return True, []
        
        existing = Quiz.objects.filter(
            id__in=quiz_ids,
            is_deleted=False,
            status='PUBLISHED'
        )
        existing_ids = set(existing.values_list('id', flat=True))
        invalid_ids = list(set(quiz_ids) - existing_ids)
        
        return len(invalid_ids) == 0, invalid_ids
    
    @staticmethod
    def validate_assignee_ids(assignee_ids: List[int]) -> Tuple[bool, List[int]]:
        """
        Validate assignee user IDs.
        
        Args:
            assignee_ids: List of user IDs to validate
            
        Returns:
            Tuple of (is_valid, invalid_ids)
        """
        if not assignee_ids:
            return False, []
        
        existing = User.objects.filter(id__in=assignee_ids, is_active=True)
        existing_ids = set(existing.values_list('id', flat=True))
        invalid_ids = list(set(assignee_ids) - existing_ids)
        
        return len(invalid_ids) == 0, invalid_ids


class StudentTaskService(BaseService):
    """
    Service for student task execution operations.
    
    Handles:
    - Student task list and detail retrieval
    - Knowledge learning progress tracking
    - Task completion logic
    """
    
    def __init__(self):
        self.task_assignment_repository = TaskAssignmentRepository()
        self.knowledge_progress_repository = KnowledgeLearningProgressRepository()
        self.task_knowledge_repository = TaskKnowledgeRepository()
        self.domain_service = TaskDomainService()
    
    def get_student_assignment(self, task_id: int, user: User) -> TaskAssignment:
        """
        Get a student's task assignment (使用 Domain Service 检查逾期状态).
        
        Args:
            task_id: Task ID
            user: Student user
            
        Returns:
            TaskAssignment instance
            
        Raises:
            BusinessError: If assignment not found
        """
        assignment = self.task_assignment_repository.get_student_assignment(
            task_id=task_id,
            user_id=user.id
        )
        self.validate_not_none(assignment, '任务不存在或未分配给您')
        
        # 使用 Domain Service 检查并更新逾期状态
        assignment_domain = TaskAssignmentMapper.to_domain(assignment)
        assignment_domain = self.domain_service.check_and_update_overdue(
            assignment_domain,
            current_time=timezone.now(),
            task_deadline=assignment.task.deadline
        )
        
        # 如果状态有变化，更新 Django Model
        if assignment_domain.status.value != assignment.status:
            assignment = self.task_assignment_repository.update_from_domain(
                assignment,
                assignment_domain
            )
            assignment.save()
        
        return assignment
    
    def ensure_knowledge_progress(self, assignment: TaskAssignment) -> None:
        """
        Ensure KnowledgeLearningProgress records exist for all task knowledge items.
        
        Args:
            assignment: The task assignment
        """
        task_knowledge_items = self.task_knowledge_repository.get_by_task(assignment.task.id)
        existing_progress = set(
            self.knowledge_progress_repository.get_by_assignment(assignment.id)
            .values_list('task_knowledge_id', flat=True)
        )
        
        for tk in task_knowledge_items:
            if tk.id not in existing_progress:
                self.knowledge_progress_repository.create_progress(
                    assignment_id=assignment.id,
                    task_knowledge_id=tk.id
                )
    
    def complete_knowledge_learning(
        assignment: TaskAssignment,
        knowledge_id: int
    ) -> KnowledgeLearningProgress:
        """
        Mark a knowledge document as completed.
        
        Args:
            assignment: The task assignment
            knowledge_id: Knowledge document ID
            
        Returns:
            Updated KnowledgeLearningProgress instance
            
        Raises:
            BusinessError: If knowledge not in task or already completed
        """
        # Check assignment status
        assignment.check_and_update_overdue()
        
        if assignment.status == 'COMPLETED':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已完成'
            )
        
        if assignment.status == 'OVERDUE':
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已逾期，无法继续学习'
            )
        
        # Find task knowledge
        task_knowledge_items = self.task_knowledge_repository.get_by_task(assignment.task.id)
        task_knowledge = None
        for tk in task_knowledge_items:
            if tk.knowledge_id == knowledge_id:
                task_knowledge = tk
                break
        
        if not task_knowledge:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='该知识文档不在此任务中'
            )
        
        # Get or create progress
        progress, created = self.knowledge_progress_repository.get_or_create_progress(
            assignment_id=assignment.id,
            task_knowledge_id=task_knowledge.id
        )
        
        if progress.is_completed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='该知识已标记为已学习'
            )
        
        # Mark as completed
        progress = self.knowledge_progress_repository.mark_completed(progress)
        progress.refresh_from_db()
        
        return progress
    
    def get_student_assignments_queryset(
        user: User,
        status_filter: str = None,
        search: str = None
    ) -> QuerySet:
        """
        Get student's task assignments queryset with filters.
        
        Args:
            user: Student user
            status_filter: Optional status filter
            search: Optional search term
            
        Returns:
            Filtered QuerySet of TaskAssignment
        """
        return self.task_assignment_repository.get_student_assignments(
            user_id=user.id,
            status=status_filter,
            search=search
        )
