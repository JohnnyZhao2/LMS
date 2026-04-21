"""Task management service."""

from types import SimpleNamespace
from typing import Any, Callable, List, Optional, Tuple

from django.db import transaction
from django.db.models import QuerySet

from apps.authorization.engine import authorize, enforce, scope_filter
from apps.authorization.roles import SUPER_ADMIN_ROLE, resolve_current_role
from apps.activity_logs.decorators import log_operation
from apps.knowledge.models import Knowledge
from apps.knowledge.services import ensure_knowledge_revision
from apps.quizzes.models import Quiz
from apps.quizzes.services import ensure_quiz_revision
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .policies import enforce_assignable_students_scope
from .selectors import task_detail_queryset, task_list_queryset


class TaskService(BaseService):
    MANAGEMENT_SIDE_ROLES = ['ADMIN', SUPER_ADMIN_ROLE]

    def get_task_queryset_for_user(self) -> QuerySet:
        qs = task_list_queryset()
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

    def get_task_by_id(self, pk: int) -> Task:
        task = task_detail_queryset().filter(pk=pk).first()
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
        group='任务管理',
        label='创建并分配任务',
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
        self._validate_create_payload(knowledge_ids, quiz_ids, assignee_ids)

        current_role = resolve_current_role(self.user)
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
            for quiz in scope_filter(
                'quiz.view',
                self.request,
                base_queryset=Quiz.objects.filter(id__in=valid_ids),
            ).prefetch_related(
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
        group='任务管理',
        label='更新任务',
    )
    def update_task(
        self,
        task: Task,
        knowledge_ids: List[int] = None,
        quiz_ids: List[int] = None,
        assignee_ids: List[int] = None,
        **kwargs,
    ) -> Task:
        self._validate_update_payload(knowledge_ids, quiz_ids, assignee_ids)
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

    @staticmethod
    def hard_delete_tasks(task_ids: List[int]) -> None:
        normalized_ids = []
        seen = set()
        for task_id in task_ids:
            if not task_id or task_id in seen:
                continue
            seen.add(task_id)
            normalized_ids.append(task_id)
        if not normalized_ids:
            return

        from apps.submissions.models import Submission

        with transaction.atomic():
            Submission.objects.filter(task_assignment__task_id__in=normalized_ids).delete()
            Task.objects.filter(id__in=normalized_ids).delete()

    @log_operation(
        'task_management',
        'delete_task',
        '{result.knowledge_count} 篇知识，{result.quiz_count} 份试卷，{result.assignee_count} 名学员',
        target_type='task',
        target_title_template='{result.title}',
        group='任务管理',
        label='删除任务',
    )
    def delete_task(self, task: Task) -> SimpleNamespace:
        snapshot = SimpleNamespace(
            id=task.id,
            title=task.title,
            knowledge_count=task.task_knowledge.count(),
            quiz_count=task.task_quizzes.count(),
            assignee_count=task.assignments.count(),
        )
        self.hard_delete_tasks([task.id])
        return snapshot

    def _ensure_valid_resource_ids(self, resource_ids: List[int], resource_model: Any, resource_label: str) -> List[int]:
        normalized_ids = self._dedupe_resource_ids(resource_ids)
        queryset = resource_model.objects.all()
        if resource_model is Quiz:
            queryset = scope_filter('quiz.view', self.request, base_queryset=queryset)
        is_valid, invalid_ids = self._validate_current_resources(normalized_ids, queryset)
        if not is_valid:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'{resource_label}不存在: {invalid_ids}',
            )
        return normalized_ids

    def _ensure_valid_assignee_ids(self, assignee_ids: List[int]) -> List[int]:
        normalized_ids = self._dedupe_resource_ids(assignee_ids)
        is_valid, invalid_ids = self.validate_assignee_ids(normalized_ids)
        if not is_valid:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'学员不存在、已停用或无学员身份: {invalid_ids}',
            )
        enforce_assignable_students_scope(normalized_ids, self.request)
        return normalized_ids

    def _validate_create_payload(
        self,
        knowledge_ids: List[int],
        quiz_ids: List[int],
        assignee_ids: List[int],
    ) -> None:
        if not knowledge_ids and not quiz_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一个知识文档或试卷',
            )
        if not assignee_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一个学员',
            )
        self._ensure_valid_resource_ids(knowledge_ids, Knowledge, '知识文档')
        self._ensure_valid_resource_ids(quiz_ids, Quiz, '试卷')
        self._ensure_valid_assignee_ids(assignee_ids)

    def _validate_update_payload(
        self,
        knowledge_ids: List[int] = None,
        quiz_ids: List[int] = None,
        assignee_ids: List[int] = None,
    ) -> None:
        if knowledge_ids is not None:
            self._ensure_valid_resource_ids(knowledge_ids, Knowledge, '知识文档')
        if quiz_ids is not None:
            self._ensure_valid_resource_ids(quiz_ids, Quiz, '试卷')
        if knowledge_ids is not None and quiz_ids is not None and not knowledge_ids and not quiz_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一个知识文档或试卷',
            )
        if assignee_ids is not None:
            if not assignee_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='请至少选择一个学员',
                )
            self._ensure_valid_assignee_ids(assignee_ids)

    @staticmethod
    def _validate_current_resources(resource_ids: List[int], resource_queryset: QuerySet) -> Tuple[bool, List[int]]:
        if not resource_ids:
            return True, []
        existing_ids = set(resource_queryset.filter(id__in=resource_ids).values_list('id', flat=True))
        invalid_ids = sorted(set(resource_ids) - existing_ids)
        return len(invalid_ids) == 0, invalid_ids

    @staticmethod
    def validate_knowledge_ids(knowledge_ids: List[int]) -> Tuple[bool, List[int]]:
        return TaskService._validate_current_resources(knowledge_ids, Knowledge.objects.all())

    @staticmethod
    def validate_quiz_ids(quiz_ids: List[int]) -> Tuple[bool, List[int]]:
        return TaskService._validate_current_resources(quiz_ids, Quiz.objects.all())

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
