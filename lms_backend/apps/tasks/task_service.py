"""
Task management service.
Provides business logic for:
- Task CRUD operations
- Task assignment management
- Permission checks for task operations
"""
from typing import Any, Callable, List, Optional, Tuple

from django.db import transaction
from django.db.models import QuerySet

from apps.knowledge.models import Knowledge
from apps.quizzes.models import Quiz
from apps.submissions.models import Submission
from apps.authorization.services import AuthorizationService
from apps.users.models import User
from apps.users.permissions import SUPER_ADMIN_ROLE, is_admin_like_role
from core.base_service import BaseService
from core.decorators import log_operation
from core.exceptions import BusinessError, ErrorCodes

from .models import (
    KnowledgeLearningProgress,
    Task,
    TaskAssignment,
    TaskKnowledge,
    TaskQuiz,
)
from .selectors import (
    task_base_queryset,
    task_detail_queryset,
)


class TaskService(BaseService):
    """
    Service for task management operations.
    Handles:
    - Task creation with knowledge/quiz associations
    - Task updates and deletions
    - Permission checks for task operations
    """

    MANAGEMENT_SIDE_ROLES = ['ADMIN', SUPER_ADMIN_ROLE]

    def get_task_queryset_for_user(self) -> QuerySet:
        """
        Get task queryset based on user's role.
        Returns:
            QuerySet of tasks accessible to the user
        """
        current_role = self.get_current_role()
        qs = task_base_queryset(include_deleted=False)
        if is_admin_like_role(current_role):
            return qs
        if current_role in ['MENTOR', 'DEPT_MANAGER']:
            return qs.filter(
                created_by=self.user,
                created_role=current_role,
            )
        assigned_task_ids = TaskAssignment.objects.filter(
            assignee=self.user
        ).values_list('task_id', flat=True)
        return qs.filter(id__in=assigned_task_ids)

    def filter_task_queryset_by_creator_side(
        self,
        queryset: QuerySet,
        creator_side: Optional[str]
    ) -> QuerySet:
        """
        Filter task queryset by creator side.
        Only ADMIN can use this filter.
        """
        if not creator_side or creator_side == 'all':
            return queryset

        if not is_admin_like_role(self.get_current_role()):
            return queryset

        if creator_side == 'management':
            return queryset.filter(created_role__in=self.MANAGEMENT_SIDE_ROLES)
        if creator_side == 'non_management':
            return queryset.exclude(created_role__in=self.MANAGEMENT_SIDE_ROLES)

        raise BusinessError(
            code=ErrorCodes.INVALID_INPUT,
            message='creator_side 参数无效，仅支持 all、management、non_management'
        )

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
        task = task_detail_queryset(include_deleted=include_deleted).filter(pk=pk).first()
        self.validate_not_none(task, f'任务 {pk} 不存在')
        return task

    def check_task_read_permission(self, task: Task) -> bool:
        """
        Check if user has permission to read a task.
        Args:
            task: The task to check
        Returns:
            True if permitted
        Raises:
            BusinessError: If permission denied
        """
        authorization_service = AuthorizationService(self.request)
        if authorization_service.has_deny_override('task.view'):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问此任务'
            )
        if not authorization_service.can('task.view'):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权访问此任务'
            )

        current_role = self.get_current_role()
        if is_admin_like_role(current_role):
            return True
        if current_role in ['MENTOR', 'DEPT_MANAGER']:
            if task.created_by == self.user and task.created_role == current_role:
                return True
        elif task.assignments.filter(assignee=self.user).exists():
            return True

        if authorization_service.has_allow_override('task.view'):
            return True

        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message='无权访问此任务'
        )

    @staticmethod
    def has_student_progress(task: Task) -> bool:
        """
        检查任务是否有学员学习进度
        Args:
            task: The task to check
        Returns:
            True if any student has started working on the task
        """
        has_knowledge_progress = KnowledgeLearningProgress.objects.filter(
            assignment__task_id=task.id,
            is_completed=True
        ).exists()
        if has_knowledge_progress:
            return True
        return Submission.objects.filter(task_assignment__task_id=task.id).exists()

    def check_task_edit_permission(self, task: Task, permission_code: str, error_message: str) -> bool:
        """
        Check if user has permission to edit a task.
        Args:
            task: The task to check
        Returns:
            True if permitted
        Raises:
            BusinessError: If permission denied
        """
        authorization_service = AuthorizationService(self.request)
        if authorization_service.has_deny_override(permission_code):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message='无权操作此任务'
            )
        if not authorization_service.can(permission_code):
            raise BusinessError(
                code=ErrorCodes.PERMISSION_DENIED,
                message=error_message,
            )

        current_role = self.get_current_role()
        if is_admin_like_role(current_role):
            return True
        if current_role in ['MENTOR', 'DEPT_MANAGER']:
            if task.created_by == self.user and task.created_role == current_role:
                return True
        if authorization_service.has_allow_override(permission_code):
            return True
        raise BusinessError(
            code=ErrorCodes.PERMISSION_DENIED,
            message=error_message,
        )

    @transaction.atomic
    @log_operation(
        'task_management',
        'create_and_assign',
        '截止 {deadline_text}，{result.knowledge_count} 篇知识，{result.quiz_count} 份试卷，{result.assignee_count} 名学员',
        target_type='task',
        target_title_template='{title}',
    )
    def create_task(
        self,
        title: str,
        description: str,
        deadline,
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
            knowledge_ids: List of knowledge document IDs
            quiz_ids: List of quiz IDs
            assignee_ids: List of assignee user IDs
        Returns:
            Created Task instance
        """
        knowledge_ids = knowledge_ids or []
        quiz_ids = quiz_ids or []
        assignee_ids = assignee_ids or []
        AuthorizationService(self.request).enforce(
            'task.create',
            error_message='无权创建任务',
        )
        current_role = self.get_current_role()
        created_role = (
            'ADMIN'
            if current_role == SUPER_ADMIN_ROLE
            else (current_role or 'ADMIN')
        )
        # Create task
        task = Task.objects.create(
            title=title,
            description=description,
            deadline=deadline,
            created_role=created_role,
            created_by=self.user,
            updated_by=self.user
        )
        # Create knowledge associations
        if knowledge_ids:
            self._create_knowledge_associations(task, knowledge_ids)
        # Create quiz associations
        if quiz_ids:
            self._create_quiz_associations(task, quiz_ids)
        # Create assignments
        self._bulk_create_assignments(
            task_id=task.id,
            assignee_ids=assignee_ids
        )
        return task

    def _bulk_create_assignments(
        self,
        task_id: int,
        assignee_ids: List[int]
    ) -> List[TaskAssignment]:
        if not assignee_ids:
            return []
        assignments = [
            TaskAssignment(
                task_id=task_id,
                assignee_id=assignee_id,
                status='IN_PROGRESS'
            )
            for assignee_id in assignee_ids
        ]
        return TaskAssignment.objects.bulk_create(assignments, batch_size=500)

    def _create_associations(
        self,
        task: Task,
        resource_ids: List[int],
        resource_model: Any,
        association_model: Any,
        resource_type: str
    ) -> None:
        """
        通用的关联创建方法（按 resource_uuid 去重）
        Args:
            task: 任务对象
            resource_ids: 资源ID列表（knowledge_ids 或 quiz_ids）
            resource_model: 资源模型（Knowledge 或 Quiz）
            association_model: 关联模型（TaskKnowledge 或 TaskQuiz）
            resource_type: 资源类型（'knowledge' 或 'quiz'）
        """
        if resource_type == 'knowledge':
            queryset = resource_model.objects.filter(
                id__in=resource_ids,
                is_deleted=False,
                is_current=True
            ).select_related('created_by', 'updated_by').prefetch_related('tags')
        else:
            queryset = resource_model.objects.filter(
                id__in=resource_ids,
                is_deleted=False,
                is_current=True
            )
        resource_map = {r.id: r for r in queryset}
        # 按 resource_uuid 去重，保留最后出现的
        seen_uuids = {}
        for resource_id in resource_ids:
            resource = resource_map.get(resource_id)
            if resource:
                seen_uuids[resource.resource_uuid] = resource_id
        deduped_ids = [
            seen_uuids[resource_map[rid].resource_uuid]
            for rid in resource_ids
            if rid in resource_map and seen_uuids.get(resource_map[rid].resource_uuid) == rid
        ]
        associations = []
        for order, resource_id in enumerate(deduped_ids, start=1):
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
        if associations:
            association_model.objects.bulk_create(associations, batch_size=500)

    def _create_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        """Create TaskKnowledge associations for a task."""
        self._create_associations(
            task=task,
            resource_ids=knowledge_ids,
            resource_model=Knowledge,
            association_model=TaskKnowledge,
            resource_type='knowledge'
        )

    def _create_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        """Create TaskQuiz associations for a task."""
        self._create_associations(
            task=task,
            resource_ids=quiz_ids,
            resource_model=Quiz,
            association_model=TaskQuiz,
            resource_type='quiz'
        )

    @transaction.atomic
    @log_operation('task_management', 'update_task', '{task_update_summary}',
                   target_type='task', target_title_template='{task.title}')
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
        has_progress = self.has_student_progress(task)
        if has_progress:
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
        if kwargs:
            for key, value in kwargs.items():
                setattr(task, key, value)
        task.updated_by = self.user
        task.save(update_fields=[*kwargs.keys(), 'updated_by'])
        if knowledge_ids is not None:
            self._update_knowledge_associations(task, knowledge_ids)
        if quiz_ids is not None:
            self._update_quiz_associations(task, quiz_ids)
        if assignee_ids is not None:
            self._update_assignments(task, assignee_ids)
        return task

    def _update_associations(
        self,
        task: Task,
        resource_ids: List[int],
        get_existing_ids: Callable[[int], List[int]],
        delete_by_task: Callable[[int], None],
        create_method: Callable[[Task, List[int]], None]
    ) -> None:
        """
        通用的关联更新方法
        """
        existing_ids = get_existing_ids(task.id)
        if existing_ids != list(resource_ids):
            delete_by_task(task.id)
            if resource_ids:
                create_method(task, resource_ids)

    def _get_task_knowledge_ids(self, task_id: int) -> List[int]:
        return list(
            TaskKnowledge.objects.filter(task_id=task_id)
            .order_by('order')
            .values_list('knowledge_id', flat=True)
        )

    def _delete_task_knowledge_by_task(self, task_id: int) -> None:
        TaskKnowledge.objects.filter(task_id=task_id).delete()

    def _get_task_quiz_ids(self, task_id: int) -> List[int]:
        return list(
            TaskQuiz.objects.filter(task_id=task_id)
            .order_by('order')
            .values_list('quiz_id', flat=True)
        )

    def _delete_task_quiz_by_task(self, task_id: int) -> None:
        TaskQuiz.objects.filter(task_id=task_id).delete()

    def _update_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        """Update TaskKnowledge associations for a task."""
        self._update_associations(
            task=task,
            resource_ids=knowledge_ids,
            get_existing_ids=self._get_task_knowledge_ids,
            delete_by_task=self._delete_task_knowledge_by_task,
            create_method=self._create_knowledge_associations
        )

    def _update_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        """Update TaskQuiz associations for a task."""
        self._update_associations(
            task=task,
            resource_ids=quiz_ids,
            get_existing_ids=self._get_task_quiz_ids,
            delete_by_task=self._delete_task_quiz_by_task,
            create_method=self._create_quiz_associations
        )

    def _update_assignments(self, task: Task, assignee_ids: List[int]) -> None:
        """Update TaskAssignment records for a task."""
        existing_assignments = TaskAssignment.objects.filter(
            task_id=task.id
        ).select_related('assignee').prefetch_related('knowledge_progress')
        existing_ids = set(existing_assignments.values_list('assignee_id', flat=True))
        new_ids = set(assignee_ids)
        to_remove = existing_ids - new_ids
        if to_remove:
            for assignment in existing_assignments.filter(assignee_id__in=to_remove):
                assignment.delete()
        to_add = new_ids - existing_ids
        self._bulk_create_assignments(
            task_id=task.id,
            assignee_ids=list(to_add)
        )

    @log_operation(
        'task_management',
        'delete_task',
        '{result.knowledge_count} 篇知识，{result.quiz_count} 份试卷，{result.assignee_count} 名学员',
        target_type='task',
        target_title_template='{result.title}',
    )
    def delete_task(self, task: Task) -> None:
        """Soft delete a task."""
        task.soft_delete()

    @staticmethod
    def _validate_published_resources(
        resource_ids: List[int],
        resource_model: Any
    ) -> Tuple[bool, List[int]]:
        """
        通用的已发布资源验证方法
        """
        if not resource_ids:
            return True, []
        published = resource_model.objects.filter(
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
        """Validate knowledge document IDs."""
        return TaskService._validate_published_resources(knowledge_ids, Knowledge)

    @staticmethod
    def validate_quiz_ids(quiz_ids: List[int]) -> Tuple[bool, List[int]]:
        """Validate quiz IDs."""
        return TaskService._validate_published_resources(quiz_ids, Quiz)

    @staticmethod
    def validate_assignee_ids(assignee_ids: List[int]) -> Tuple[bool, List[int]]:
        """Validate assignee user IDs."""
        if not assignee_ids:
            return False, []
        existing = User.objects.filter(
            id__in=assignee_ids,
            is_active=True,
            roles__code='STUDENT',
        ).distinct()
        existing_ids = set(existing.values_list('id', flat=True))
        invalid_ids = list(set(assignee_ids) - existing_ids)
        return len(invalid_ids) == 0, invalid_ids
