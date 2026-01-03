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
from apps.users.models import User
from apps.users.permissions import (
    get_current_role,
    get_accessible_students,
    validate_students_in_scope,
)
from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz, KnowledgeLearningProgress


class TaskService:
    """
    Service for task management operations.
    
    Handles:
    - Task creation with knowledge/quiz associations
    - Task updates and deletions
    - Task closing logic
    - Permission checks for task operations
    """
    
    @staticmethod
    def get_task_queryset_for_user(user: User) -> QuerySet:
        """
        Get task queryset based on user's role.
        
        Args:
            user: The requesting user
            
        Returns:
            QuerySet of tasks accessible to the user
        """
        current_role = get_current_role(user)
        
        if current_role == 'ADMIN':
            return Task.objects.filter(is_deleted=False)
        elif current_role in ['MENTOR', 'DEPT_MANAGER']:
            return Task.objects.filter(is_deleted=False, created_by=user)
        else:
            # Student: only assigned tasks
            assigned_task_ids = TaskAssignment.objects.filter(
                assignee=user
            ).values_list('task_id', flat=True)
            return Task.objects.filter(is_deleted=False, id__in=assigned_task_ids)
    
    @staticmethod
    def get_task_by_id(pk: int, include_deleted: bool = False) -> Task:
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
        try:
            queryset = Task.objects.select_related(
                'created_by'
            ).prefetch_related(
                'task_knowledge__knowledge',
                'task_quizzes__quiz',
                'assignments__assignee'
            )
            if not include_deleted:
                queryset = queryset.filter(is_deleted=False)
            return queryset.get(pk=pk)
        except Task.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在'
            )
    
    @staticmethod
    def check_task_read_permission(task: Task, user: User) -> bool:
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
    
    @staticmethod
    def check_task_edit_permission(task: Task, user: User) -> bool:
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
        if task.is_closed:
            return True
        return timezone.now() > task.deadline
    
    @staticmethod
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
        task = Task.objects.create(
            title=title,
            description=description,
            deadline=deadline,
            created_by=created_by
        )
        
        # Create knowledge associations
        if knowledge_ids:
            TaskService._create_knowledge_associations(task, knowledge_ids)
        
        # Create quiz associations
        if quiz_ids:
            TaskService._create_quiz_associations(task, quiz_ids)
        
        # Create assignments
        for assignee_id in assignee_ids:
            TaskAssignment.objects.create(
                task=task,
                assignee_id=assignee_id
            )
        
        return task
    
    @staticmethod
    def _create_knowledge_associations(task: Task, knowledge_ids: List[int]) -> None:
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
            TaskKnowledge.objects.create(
                task=task,
                knowledge=knowledge,
                order=order,
                resource_uuid=knowledge.resource_uuid,
                version_number=knowledge.version_number
            )
    
    @staticmethod
    def _create_quiz_associations(task: Task, quiz_ids: List[int]) -> None:
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
            TaskQuiz.objects.create(
                task=task,
                quiz=quiz,
                order=order,
                resource_uuid=quiz.resource_uuid,
                version_number=quiz.version_number
            )
    
    @staticmethod
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
        for attr, value in kwargs.items():
            if hasattr(task, attr):
                setattr(task, attr, value)
        task.save()
        
        # Update knowledge associations
        if knowledge_ids is not None:
            TaskService._update_knowledge_associations(task, knowledge_ids)
        
        # Update quiz associations
        if quiz_ids is not None:
            TaskService._update_quiz_associations(task, quiz_ids)
        
        # Update assignments
        if assignee_ids is not None:
            TaskService._update_assignments(task, assignee_ids)
        
        return task
    
    @staticmethod
    def _update_knowledge_associations(task: Task, knowledge_ids: List[int]) -> None:
        """Update TaskKnowledge associations for a task."""
        existing_ids = list(
            task.task_knowledge.order_by('order').values_list('knowledge_id', flat=True)
        )
        if existing_ids != list(knowledge_ids):
            TaskKnowledge.objects.filter(task=task).delete()
            if knowledge_ids:
                TaskService._create_knowledge_associations(task, knowledge_ids)
    
    @staticmethod
    def _update_quiz_associations(task: Task, quiz_ids: List[int]) -> None:
        """Update TaskQuiz associations for a task."""
        existing_ids = list(
            task.task_quizzes.order_by('order').values_list('quiz_id', flat=True)
        )
        if existing_ids != list(quiz_ids):
            TaskQuiz.objects.filter(task=task).delete()
            if quiz_ids:
                TaskService._create_quiz_associations(task, quiz_ids)
    
    @staticmethod
    def _update_assignments(task: Task, assignee_ids: List[int]) -> None:
        """Update TaskAssignment records for a task."""
        existing_ids = set(
            TaskAssignment.objects.filter(task=task).values_list('assignee_id', flat=True)
        )
        new_ids = set(assignee_ids)
        
        # Remove assignments
        to_remove = existing_ids - new_ids
        if to_remove:
            TaskAssignment.objects.filter(task=task, assignee_id__in=to_remove).delete()
        
        # Add new assignments
        to_add = new_ids - existing_ids
        for assignee_id in to_add:
            TaskAssignment.objects.create(task=task, assignee_id=assignee_id)
    
    @staticmethod
    def delete_task(task: Task) -> None:
        """
        Soft delete a task.
        
        Args:
            task: Task to delete
        """
        task.is_deleted = True
        task.save(update_fields=['is_deleted'])
    
    @staticmethod
    def close_task(task: Task) -> Task:
        """
        Force close a task.
        
        Args:
            task: Task to close
            
        Returns:
            Closed Task instance
            
        Raises:
            BusinessError: If task is already closed
        """
        if task.is_closed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已经结束'
            )
        
        task.close()
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


class StudentTaskService:
    """
    Service for student task execution operations.
    
    Handles:
    - Student task list and detail retrieval
    - Knowledge learning progress tracking
    - Task completion logic
    """
    
    @staticmethod
    def get_student_assignment(task_id: int, user: User) -> TaskAssignment:
        """
        Get a student's task assignment.
        
        Args:
            task_id: Task ID
            user: Student user
            
        Returns:
            TaskAssignment instance
            
        Raises:
            BusinessError: If assignment not found
        """
        try:
            assignment = TaskAssignment.objects.select_related(
                'task', 'task__created_by'
            ).prefetch_related(
                'task__task_knowledge__knowledge',
                'task__task_quizzes__quiz',
                'knowledge_progress__task_knowledge__knowledge'
            ).get(
                task_id=task_id,
                assignee=user,
                task__is_deleted=False
            )
            
            # Check and update overdue status
            assignment.check_and_update_overdue()
            
            return assignment
        except TaskAssignment.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='任务不存在或未分配给您'
            )
    
    @staticmethod
    def ensure_knowledge_progress(assignment: TaskAssignment) -> None:
        """
        Ensure KnowledgeLearningProgress records exist for all task knowledge items.
        
        Args:
            assignment: The task assignment
        """
        task_knowledge_items = assignment.task.task_knowledge.all()
        existing_progress = set(
            assignment.knowledge_progress.values_list('task_knowledge_id', flat=True)
        )
        
        for tk in task_knowledge_items:
            if tk.id not in existing_progress:
                KnowledgeLearningProgress.objects.create(
                    assignment=assignment,
                    task_knowledge=tk,
                    is_completed=False
                )
    
    @staticmethod
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
        try:
            task_knowledge = TaskKnowledge.objects.get(
                task=assignment.task,
                knowledge_id=knowledge_id
            )
        except TaskKnowledge.DoesNotExist:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='该知识文档不在此任务中'
            )
        
        # Get or create progress
        progress, created = KnowledgeLearningProgress.objects.get_or_create(
            assignment=assignment,
            task_knowledge=task_knowledge,
            defaults={'is_completed': False}
        )
        
        if progress.is_completed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='该知识已标记为已学习'
            )
        
        # Mark as completed
        progress.mark_completed()
        progress.refresh_from_db()
        
        return progress
    
    @staticmethod
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
        queryset = TaskAssignment.objects.filter(
            assignee=user,
            task__is_deleted=False
        ).select_related(
            'task', 'task__created_by'
        ).prefetch_related(
            'task__task_knowledge',
            'task__task_quizzes',
            'knowledge_progress'
        )
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if search:
            queryset = queryset.filter(task__title__icontains=search)
        
        return queryset.order_by('-created_at')
