"""Task management service."""

from typing import Any, Callable, List, Optional, Tuple

from django.db import transaction
from django.db.models import QuerySet

from apps.authorization.engine import authorize, enforce, scope_filter
from apps.authorization.roles import SUPER_ADMIN_ROLE
from apps.knowledge.models import Knowledge
from apps.knowledge.services import ensure_knowledge_revision
from apps.quizzes.models import Quiz
from apps.quizzes.services import ensure_quiz_revision
from apps.users.models import User
from core.base_service import BaseService
from core.decorators import log_operation
from core.exceptions import BusinessError, ErrorCodes

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .selectors import task_detail_queryset, task_list_queryset


class TaskService(BaseService):
    MANAGEMENT_SIDE_ROLES = ['ADMIN', SUPER_ADMIN_ROLE]

    def get_task_queryset_for_user(self) -> QuerySet:
        qs = task_list_queryset(include_deleted=False)
        return scope_filter('task.view', self.request, base_queryset=qs)

    def filter_task_queryset_by_creator_side(
        self,
        queryset: QuerySet,
        creator_side: Optional[str],
    ) -> QuerySet:
        if not creator_side or creator_side == 'all':
            return queryset
        if not authorize('user.view', self.request).allowed:
            return queryset
        if creator_side == 'management':
            return queryset.filter(created_role__in=self.MANAGEMENT_SIDE_ROLES)
        if creator_side == 'non_management':
            return queryset.exclude(created_role__in=self.MANAGEMENT_SIDE_ROLES)
        raise BusinessError(
            code=ErrorCodes.INVALID_INPUT,
            message='creator_side 参数无效，仅支持 all、management、non_management',
        )

    def get_task_by_id(self, pk: int, include_deleted: bool = False) -> Task:
        task = task_detail_queryset(include_deleted=include_deleted).filter(pk=pk).first()
        self.validate_not_none(task, f'任务 {pk} 不存在')
        return task

    def check_task_read_permission(self, task: Task) -> bool:
        enforce('task.view', self.request, resource=task, error_message='无权访问此任务')
        return True

    def check_task_edit_permission(self, task: Task, permission_code: str, error_message: str) -> bool:
        enforce(permission_code, self.request, resource=task, error_message=error_message)
        return True

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
        knowledge_ids = knowledge_ids or []
        quiz_ids = quiz_ids or []
        assignee_ids = assignee_ids or []
        enforce('task.create', self.request, error_message='无权创建任务')

        current_role = self.get_current_role()
        created_role = 'ADMIN' if current_role == SUPER_ADMIN_ROLE else (current_role or 'ADMIN')
        task = Task.objects.create(
            title=title,
            description=description,
            deadline=deadline,
            created_role=created_role,
            created_by=self.user,
            updated_by=self.user,
        )
        if knowledge_ids:
            self._create_knowledge_associations(task, knowledge_ids)
        if quiz_ids:
            self._create_quiz_associations(task, quiz_ids)
        self._bulk_create_assignments(task_id=task.id, assignee_ids=assignee_ids)
        return task

    def _bulk_create_assignments(self, task_id: int, assignee_ids: List[int]) -> List[TaskAssignment]:
        if not assignee_ids:
            return []
        assignments = [
            TaskAssignment(task_id=task_id, assignee_id=assignee_id, status='IN_PROGRESS')
            for assignee_id in assignee_ids
        ]
        return TaskAssignment.objects.bulk_create(assignments, batch_size=500)

    def _dedupe_resource_ids(self, resource_ids: List[int]) -> List[int]:
        seen = set()
        ordered = []
        for resource_id in resource_ids:
            if resource_id in seen:
                continue
            seen.add(resource_id)
            ordered.append(resource_id)
        return ordered

    def _create_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        valid_ids = self._dedupe_resource_ids(knowledge_ids)
        knowledge_map = {
            knowledge.id: knowledge
            for knowledge in Knowledge.objects.filter(id__in=valid_ids).prefetch_related('tags')
        }
        associations = []
        for order, knowledge_id in enumerate(valid_ids, start=1):
            knowledge = knowledge_map.get(knowledge_id)
            if knowledge is None:
                raise BusinessError(
                    code=ErrorCodes.RESOURCE_NOT_FOUND,
                    message=f'知识文档 {knowledge_id} 不存在',
                )
            revision = ensure_knowledge_revision(knowledge, actor=self.user)
            associations.append(
                TaskKnowledge(
                    task=task,
                    knowledge=revision,
                    source_knowledge=knowledge,
                    order=order,
                )
            )
        if associations:
            TaskKnowledge.objects.bulk_create(associations, batch_size=500)

    def _create_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        valid_ids = self._dedupe_resource_ids(quiz_ids)
        quiz_map = {
            quiz.id: quiz
            for quiz in Quiz.objects.filter(id__in=valid_ids).prefetch_related(
                'quiz_questions__question_options',
                'quiz_questions__question__tags',
                'quiz_questions__question__space_tag',
            )
        }
        associations = []
        for order, quiz_id in enumerate(valid_ids, start=1):
            quiz = quiz_map.get(quiz_id)
            if quiz is None:
                raise BusinessError(
                    code=ErrorCodes.RESOURCE_NOT_FOUND,
                    message=f'试卷 {quiz_id} 不存在',
                )
            revision = ensure_quiz_revision(quiz, actor=self.user)
            associations.append(
                TaskQuiz(
                    task=task,
                    quiz=revision,
                    source_quiz=quiz,
                    order=order,
                )
            )
        if associations:
            TaskQuiz.objects.bulk_create(associations, batch_size=500)

    @transaction.atomic
    @log_operation(
        'task_management',
        'update_task',
        '{task_update_summary}',
        target_type='task',
        target_title_template='{task.title}',
    )
    def update_task(
        self,
        task: Task,
        knowledge_ids: List[int] = None,
        quiz_ids: List[int] = None,
        assignee_ids: List[int] = None,
        **kwargs,
    ) -> Task:
        has_progress = task.has_student_progress
        if has_progress:
            if knowledge_ids is not None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有学员开始学习，无法修改知识文档',
                )
            if quiz_ids is not None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有学员开始学习，无法修改试卷',
                )
            if assignee_ids is not None:
                existing_ids = set(task.assignments.values_list('assignee_id', flat=True))
                new_ids = set(assignee_ids)
                removed_ids = existing_ids - new_ids
                if removed_ids:
                    raise BusinessError(
                        code=ErrorCodes.INVALID_OPERATION,
                        message='任务已有学员开始学习，无法移除已分配的学员',
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
        create_method: Callable[[Task, List[int]], None],
    ) -> None:
        existing_ids = get_existing_ids(task.id)
        normalized_ids = self._dedupe_resource_ids(resource_ids)
        if existing_ids != normalized_ids:
            delete_by_task(task.id)
            if normalized_ids:
                create_method(task, normalized_ids)

    def _get_task_knowledge_ids(self, task_id: int) -> List[int]:
        return list(
            TaskKnowledge.objects.filter(task_id=task_id)
            .order_by('order')
            .values_list('source_knowledge_id', flat=True)
        )

    def _delete_task_knowledge_by_task(self, task_id: int) -> None:
        TaskKnowledge.objects.filter(task_id=task_id).delete()

    def _get_task_quiz_ids(self, task_id: int) -> List[int]:
        return list(
            TaskQuiz.objects.filter(task_id=task_id)
            .order_by('order')
            .values_list('source_quiz_id', flat=True)
        )

    def _delete_task_quiz_by_task(self, task_id: int) -> None:
        TaskQuiz.objects.filter(task_id=task_id).delete()

    def _update_knowledge_associations(self, task: Task, knowledge_ids: List[int]) -> None:
        self._update_associations(
            task=task,
            resource_ids=knowledge_ids,
            get_existing_ids=self._get_task_knowledge_ids,
            delete_by_task=self._delete_task_knowledge_by_task,
            create_method=self._create_knowledge_associations,
        )

    def _update_quiz_associations(self, task: Task, quiz_ids: List[int]) -> None:
        self._update_associations(
            task=task,
            resource_ids=quiz_ids,
            get_existing_ids=self._get_task_quiz_ids,
            delete_by_task=self._delete_task_quiz_by_task,
            create_method=self._create_quiz_associations,
        )

    def _update_assignments(self, task: Task, assignee_ids: List[int]) -> None:
        existing_assignments = TaskAssignment.objects.filter(task_id=task.id)
        existing_ids = set(existing_assignments.values_list('assignee_id', flat=True))
        new_ids = set(assignee_ids)
        to_remove = existing_ids - new_ids
        if to_remove:
            existing_assignments.filter(assignee_id__in=to_remove).delete()
        to_add = new_ids - existing_ids
        self._bulk_create_assignments(task_id=task.id, assignee_ids=list(to_add))

    @log_operation(
        'task_management',
        'delete_task',
        '{result.knowledge_count} 篇知识，{result.quiz_count} 份试卷，{result.assignee_count} 名学员',
        target_type='task',
        target_title_template='{result.title}',
    )
    def delete_task(self, task: Task) -> None:
        task.soft_delete()

    @staticmethod
    def _validate_current_resources(resource_ids: List[int], resource_model: Any) -> Tuple[bool, List[int]]:
        if not resource_ids:
            return True, []
        existing_ids = set(resource_model.objects.filter(id__in=resource_ids).values_list('id', flat=True))
        invalid_ids = sorted(set(resource_ids) - existing_ids)
        return len(invalid_ids) == 0, invalid_ids

    @staticmethod
    def validate_knowledge_ids(knowledge_ids: List[int]) -> Tuple[bool, List[int]]:
        return TaskService._validate_current_resources(knowledge_ids, Knowledge)

    @staticmethod
    def validate_quiz_ids(quiz_ids: List[int]) -> Tuple[bool, List[int]]:
        return TaskService._validate_current_resources(quiz_ids, Quiz)

    @staticmethod
    def validate_assignee_ids(assignee_ids: List[int]) -> Tuple[bool, List[int]]:
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
