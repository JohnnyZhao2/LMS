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
from typing import List, Optional, Dict, Any, Tuple, Callable
from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone
from core.exceptions import BusinessError, ErrorCodes
from core.base_service import BaseService
from apps.users.models import User
from apps.users.repositories import UserRepository
from apps.users.permissions import (
    get_current_role,
    get_accessible_students,
)
from apps.knowledge.repositories import KnowledgeRepository
from apps.quizzes.models import Quiz
from apps.quizzes.repositories import QuizRepository
from apps.submissions.repositories import SubmissionRepository
from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz, KnowledgeLearningProgress
from .repositories import (
    TaskRepository,
    TaskAssignmentRepository,
    TaskKnowledgeRepository,
    TaskQuizRepository,
    KnowledgeLearningProgressRepository,
)


def extract_knowledge_summary(knowledge, max_length: int = 160) -> str:
    if knowledge.knowledge_type == 'OTHER':
        text = knowledge.content or ''
    else:
        parts = [
            knowledge.fault_scenario,
            knowledge.trigger_process,
            knowledge.solution,
            knowledge.verification_plan,
            knowledge.recovery_plan,
        ]
        text = next((p for p in parts if p), '')
    return text[:max_length] if text else ''

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
        self.knowledge_progress_repository = KnowledgeLearningProgressRepository()
        self.knowledge_repository = KnowledgeRepository()
        self.quiz_repository = QuizRepository()
        self.submission_repository = SubmissionRepository()
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

    def has_student_progress(self, task: Task) -> bool:
        """
        检查任务是否有学员学习进度

        Args:
            task: The task to check

        Returns:
            True if any student has started working on the task
        """
        has_knowledge_progress = self.knowledge_progress_repository.has_completed_by_task(task.id)
        if has_knowledge_progress:
            return True
        return self.submission_repository.exists_by_task(task.id)

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
        if task.is_closed:
            return True
        return timezone.now() > task.deadline
    @transaction.atomic
    def create_task(
        self,
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
        self.task_assignment_repository.bulk_create_assignments(
            task_id=task.id,
            assignee_ids=assignee_ids
        )
        return task
    def _create_associations(
        self,
        task: Task,
        resource_ids: List[int],
        repository: Any,
        association_repository: Any,
        resource_type: str
    ) -> None:
        """
        通用的关联创建方法
        Args:
            task: 任务对象
            resource_ids: 资源ID列表（knowledge_ids 或 quiz_ids）
            repository: 资源仓储对象（KnowledgeRepository 或 QuizRepository）
            association_repository: 关联仓储对象（TaskKnowledgeRepository 或 TaskQuizRepository）
            resource_type: 资源类型（'knowledge' 或 'quiz'）
        """
        # 通过Repository获取已发布的资源
        if resource_type == 'knowledge':
            # Knowledge需要prefetch_related
            queryset = repository.model.objects.filter(
                id__in=resource_ids,
                is_deleted=False,
                is_current=True
            ).select_related('created_by').prefetch_related('system_tags', 'operation_tags')
        else:  # quiz
            queryset = repository.model.objects.filter(
                id__in=resource_ids,
                is_deleted=False,
                is_current=True
            )
        resource_map = {r.id: r for r in queryset}
        associations = []
        for order, resource_id in enumerate(resource_ids, start=1):
            resource = resource_map.get(resource_id)
            if not resource:
                continue
            if resource_type == 'knowledge':
                associations.append(TaskKnowledge(
                    task_id=task.id,
                    knowledge_id=resource_id,
                    order=order
                ))
            else:
                associations.append(TaskQuiz(
                    task_id=task.id,
                    quiz_id=resource_id,
                    order=order
                ))
        association_repository.bulk_create_associations(associations)
    def _create_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        """Create TaskKnowledge associations for a task."""
        self._create_associations(
            task=task,
            resource_ids=knowledge_ids,
            repository=self.knowledge_repository,
            association_repository=self.task_knowledge_repository,
            resource_type='knowledge'
        )
    def _create_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        """Create TaskQuiz associations for a task."""
        self._create_associations(
            task=task,
            resource_ids=quiz_ids,
            repository=self.quiz_repository,
            association_repository=self.task_quiz_repository,
            resource_type='quiz'
        )
    @transaction.atomic
    def update_task(
        self,
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

        Raises:
            BusinessError: If editing restricted fields with student progress
        """
        # Check if task has student progress
        has_progress = self.has_student_progress(task)

        # If has progress, enforce restrictions
        if has_progress:
            # Cannot edit resources
            if knowledge_ids is not None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有学员开始学习，无法修改知识文档'
                )

            if quiz_ids is not None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有学员开始学习，无法修改试卷'
                )

            # Cannot remove assignees (only add)
            if assignee_ids is not None:
                existing_ids = set(
                    task.assignments.values_list('assignee_id', flat=True)
                )
                new_ids = set(assignee_ids)
                removed_ids = existing_ids - new_ids

                if removed_ids:
                    raise BusinessError(
                        code=ErrorCodes.INVALID_OPERATION,
                        message='任务已有学员开始学习，无法移除已分配的学员'
                    )

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
    def _update_associations(
        self,
        task: Task,
        resource_ids: List[int],
        repository: Any,
        create_method: Callable[[Task, List[int]], None]
    ) -> None:
        """
        通用的关联更新方法
        Args:
            task: 任务对象
            resource_ids: 资源ID列表（knowledge_ids 或 quiz_ids）
            repository: 关联仓储对象（TaskKnowledgeRepository 或 TaskQuizRepository）
            create_method: 创建关联的方法（_create_knowledge_associations 或 _create_quiz_associations）
        """
        existing_ids = repository.get_existing_ids(task.id)
        if existing_ids != list(resource_ids):
            repository.delete_by_task(task.id)
            if resource_ids:
                create_method(task, resource_ids)
    def _update_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        """Update TaskKnowledge associations for a task."""
        self._update_associations(
            task=task,
            resource_ids=knowledge_ids,
            repository=self.task_knowledge_repository,
            create_method=self._create_knowledge_associations
        )
    def _update_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        """Update TaskQuiz associations for a task."""
        self._update_associations(
            task=task,
            resource_ids=quiz_ids,
            repository=self.task_quiz_repository,
            create_method=self._create_quiz_associations
        )
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
        self.task_assignment_repository.bulk_create_assignments(
            task_id=task.id,
            assignee_ids=list(to_add)
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
        Force close a task.
        Args:
            task: Task to close
        Returns:
            Closed Task instance
        Raises:
            BusinessError: If task is already closed
        """
        # 检查任务是否已关闭
        if task.is_closed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已经结束'
            )
        # 关闭任务
        task.is_closed = True
        task.closed_at = timezone.now()
        task.save(update_fields=['is_closed', 'closed_at'])
        # 将未完成的分配记录标记为已逾期
        task.assignments.filter(
            status='IN_PROGRESS'
        ).update(status='OVERDUE')
        task.refresh_from_db()
        return task
    @staticmethod
    def _validate_published_resources(
        resource_ids: List[int],
        repository: Any
    ) -> Tuple[bool, List[int]]:
        """
        通用的已发布资源验证方法
        Args:
            resource_ids: 资源ID列表
            repository: 资源仓储对象
            check_draft: 是否检查草稿版本（用于Knowledge）
        Returns:
            Tuple of (is_valid, draft_ids_or_empty, not_found_ids)
        """
        if not resource_ids:
            return True, []
        # 通过Repository获取已发布的资源
        published = repository.model.objects.filter(
            id__in=resource_ids,
            is_deleted=False,
            is_current=True
        )
        published_ids = set(published.values_list('id', flat=True))
        invalid_ids = set(resource_ids) - published_ids
        if not invalid_ids:
            return True, []
        return False, list(invalid_ids)
    @staticmethod
    def validate_knowledge_ids(knowledge_ids: List[int]) -> Tuple[bool, List[int]]:
        """
        Validate knowledge document IDs.
        Args:
            knowledge_ids: List of knowledge IDs to validate
        Returns:
            Tuple of (is_valid, draft_ids, not_found_ids)
        """
        knowledge_repo = KnowledgeRepository()
        return TaskService._validate_published_resources(
            knowledge_ids,
            knowledge_repo
        )
    @staticmethod
    def validate_quiz_ids(quiz_ids: List[int]) -> Tuple[bool, List[int]]:
        """
        Validate quiz IDs.
        Args:
            quiz_ids: List of quiz IDs to validate
        Returns:
            Tuple of (is_valid, invalid_ids)
        """
        quiz_repo = QuizRepository()
        is_valid, invalid_ids = TaskService._validate_published_resources(
            quiz_ids,
            quiz_repo
        )
        return is_valid, invalid_ids
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
        user_repo = UserRepository()
        # 用户验证逻辑不同：检查is_active而不是status
        existing = user_repo.model.objects.filter(
            id__in=assignee_ids,
            is_active=True
        )
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
        self.task_quiz_repository = TaskQuizRepository()
        self.submission_repository = SubmissionRepository()
    def get_student_assignment(self, task_id: int, user: User) -> TaskAssignment:
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
        assignment = self.task_assignment_repository.get_student_assignment(
            task_id=task_id,
            user_id=user.id
        )
        self.validate_not_none(assignment, '任务不存在或未分配给您')
        # 检查并更新逾期状态
        self._check_and_update_overdue(assignment)
        return assignment
    def _check_and_update_overdue(self, assignment: TaskAssignment) -> None:
        """
        检查并更新任务分配的逾期状态
        Args:
            assignment: 任务分配对象
        """
        if assignment.status == 'COMPLETED':
            return
        current_time = timezone.now()
        task_deadline = assignment.task.deadline
        if current_time > task_deadline and assignment.status != 'OVERDUE':
            assignment.status = 'OVERDUE'
            assignment.save(update_fields=['status'])
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
        self,
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
    def get_student_knowledge_items(self, assignment: TaskAssignment) -> List[dict]:
        """
        获取学员任务的知识条目与进度
        Args:
            assignment: 任务分配对象
        Returns:
            知识条目列表
        """
        task_knowledge_items = self.task_knowledge_repository.get_by_task(assignment.task.id)
        progress_map = {
            p.task_knowledge_id: p
            for p in self.knowledge_progress_repository.get_by_assignment(assignment.id)
        }
        result = []
        for tk in task_knowledge_items:
            progress = progress_map.get(tk.id)
            knowledge = tk.knowledge
            result.append({
                'id': tk.id,
                'knowledge_id': tk.knowledge_id,
                'title': knowledge.title,
                'knowledge_type': knowledge.knowledge_type,
                'knowledge_type_display': knowledge.get_knowledge_type_display(),
                'summary': extract_knowledge_summary(knowledge),
                'order': tk.order,
                'is_completed': progress.is_completed if progress else False,
                'completed_at': progress.completed_at if progress else None,
            })
        return sorted(result, key=lambda x: x['order'])

    def get_student_quiz_items(self, assignment: TaskAssignment) -> List[dict]:
        """
        获取学员任务的试卷条目与提交状态
        Args:
            assignment: 任务分配对象
        Returns:
            试卷条目列表
        """
        task_quiz_items = self.task_quiz_repository.get_by_task(assignment.task.id)
        submissions = self.submission_repository.get_submissions_for_assignment(
            assignment.id,
            statuses=['SUBMITTED', 'GRADING', 'GRADED']
        )
        submission_map = {}
        for submission in submissions:
            submission_map.setdefault(submission.quiz_id, []).append(submission)
        result = []
        for tq in task_quiz_items:
            quiz = tq.quiz
            quiz_subs = submission_map.get(tq.quiz_id, [])
            is_completed = len(quiz_subs) > 0
            best_sub = max(quiz_subs, key=lambda x: x.obtained_score or 0) if is_completed else None
            latest_sub = max(quiz_subs, key=lambda x: x.submitted_at) if is_completed else None
            result.append({
                'id': tq.id,
                'quiz': tq.quiz_id,
                'quiz_id': tq.quiz_id,
                'quiz_title': quiz.title,
                'quiz_type': quiz.quiz_type,
                'quiz_type_display': quiz.get_quiz_type_display(),
                'description': quiz.description,
                'question_count': quiz.question_count,
                'total_score': float(quiz.total_score) if quiz.total_score else 0,
                'duration': quiz.duration,
                'pass_score': float(quiz.pass_score) if quiz.pass_score else None,
                'order': tq.order,
                'is_completed': is_completed,
                'score': float(best_sub.obtained_score) if best_sub and best_sub.obtained_score is not None else None,
                'latest_submission_id': latest_sub.id if latest_sub else None,
                'latest_status': latest_sub.status if latest_sub else None,
            })
        return sorted(result, key=lambda x: x['order'])

    def get_student_assignments_queryset(
        self,
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
