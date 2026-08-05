"""任务管理与学员执行业务。"""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any, List

from django.db import transaction
from django.db.models import Exists, OuterRef, Q, QuerySet
from django.utils import timezone

from apps.activity_logs.decorators import log_operation
from apps.authorization.engine import enforce, scope_filter
from apps.authorization.roles import (
    SUPER_ADMIN_ROLE,
    enforce_student_workspace,
    is_student_workspace,
    resolve_current_role,
)
from apps.knowledge.models import Knowledge
from apps.knowledge.services import ensure_knowledge_revision
from apps.quizzes.models import Quiz
from apps.quizzes.services import ensure_quiz_revision
from apps.submissions.models import Submission
from apps.users.models import User
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import KnowledgeLearningProgress, Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .policies import enforce_assignable_students_scope
from .progress import (
    QUIZ_COMPLETION_STATUSES,
    TASK_EXECUTION_STATUS_LABELS,
    build_assignment_progress,
    sync_assignment_completion_status,
    sync_assignment_overdue_status,
)
from .selectors import (
    assignment_detail_queryset,
    assignment_list_queryset,
    knowledge_progress_queryset,
    task_detail_queryset,
    task_knowledge_queryset,
    task_list_queryset,
    task_quiz_queryset,
)


STUDENT_TASK_LIST_STATUSES = set(TASK_EXECUTION_STATUS_LABELS) - {'COMPLETED_ABNORMAL'}
ORDER_OFFSET = 100_000


def _format_datetime(value) -> str:
    if value is None or not hasattr(value, 'strftime'):
        return ''
    return value.strftime('%Y-%m-%d %H:%M')


def _task_update_summary(args: dict) -> str:
    parts = []
    if 'title' in args:
        parts.append('任务标题')
    if 'description' in args:
        parts.append('任务说明')
    if 'deadline' in args:
        parts.append(f'截止时间调整为 {_format_datetime(args.get("deadline"))}')
    if args.get('knowledge_ids') is not None:
        parts.append(f'关联知识调整为 {len(args["knowledge_ids"])} 篇')
    if args.get('quiz_ids') is not None:
        parts.append(f'关联试卷调整为 {len(args["quiz_ids"])} 份')
    if args.get('assignee_ids') is not None:
        parts.append(f'分配学员调整为 {len(args["assignee_ids"])} 名')
    return '；'.join(parts) if parts else '任务配置已调整'


def _create_task_event(self, result, args):
    return {
        'description': (
            f'截止 {_format_datetime(args.get("deadline"))}，'
            f'{result.knowledge_count} 篇知识，{result.quiz_count} 份试卷，'
            f'{result.assignee_count} 名人员'
        ),
        'target_type': 'task',
        'target_id': str(result.id),
        'target_title': args.get('title') or result.title,
    }


def _update_task_event(self, result, args):
    return {
        'description': _task_update_summary(args),
        'target_type': 'task',
        'target_id': str(result.id),
        'target_title': result.title,
    }


def _delete_task_event(self, result, args):
    return {
        'description': (
            f'{result.knowledge_count} 篇知识，{result.quiz_count} 份试卷，'
            f'{result.assignee_count} 名人员'
        ),
        'target_type': 'task',
        'target_id': str(result.id),
        'target_title': result.title,
    }


def _complete_knowledge_event(self, result, args):
    assignment = args['assignment']
    knowledge_title = result.task_knowledge.knowledge.title
    return {
        'description': f'任务：{assignment.task.title}',
        'target_type': 'knowledge',
        'target_id': str(result.id),
        'target_title': knowledge_title,
    }


class TaskService(BaseService):
    """任务发布、编辑、删除。"""

    def get_task_queryset_for_user(self) -> QuerySet:
        return scope_filter('task.view', self.request, base_queryset=task_list_queryset())

    def get_task_by_id(self, pk: int) -> Task:
        task = task_detail_queryset().filter(pk=pk).first()
        self.validate_not_none(task, f'任务 {pk} 不存在')
        return task

    def get_readable_task(self, pk: int) -> Task:
        task = self.get_task_by_id(pk)
        if is_student_workspace(self.request):
            enforce_student_workspace(self.request, error_message='无权访问此任务')
            if not task.assignments.filter(assignee_id=self.user.id).exists():
                raise BusinessError(code=ErrorCodes.PERMISSION_DENIED, message='无权访问此任务')
            return task
        enforce('task.view', self.request, resource=task, error_message='无权访问此任务')
        return task

    @transaction.atomic
    @log_operation(
        'task_management',
        'create_and_assign',
        group='任务管理',
        label='创建并分配任务',
        build_event=_create_task_event,
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
        enforce('task.create', self.request, error_message='无权创建任务')
        knowledge_ids = knowledge_ids or []
        quiz_ids = quiz_ids or []
        assignee_ids = assignee_ids or []
        knowledge_objs = self._load_scoped_knowledge(knowledge_ids)
        quiz_objs = self._load_scoped_quizzes(quiz_ids)
        assignee_ids = self._ensure_valid_assignee_ids(assignee_ids)
        if not knowledge_objs and not quiz_objs:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一个知识文档或试卷',
            )
        if not assignee_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一名指派人员',
            )

        current_role = resolve_current_role(self.user)
        created_role = 'GLOBAL' if current_role == SUPER_ADMIN_ROLE else (current_role or 'GLOBAL')
        task = Task.objects.create(
            title=title,
            description=description,
            deadline=deadline,
            created_role=created_role,
            created_by=self.user,
            updated_by=self.user,
        )
        if knowledge_objs:
            self._create_knowledge_associations(task, knowledge_objs)
        if quiz_objs:
            self._create_quiz_associations(task, quiz_objs)
        self._bulk_create_assignments(task_id=task.id, assignee_ids=assignee_ids)
        return task

    @transaction.atomic
    @log_operation(
        'task_management',
        'update_task',
        group='任务管理',
        label='更新任务',
        build_event=_update_task_event,
    )
    def update_task(
        self,
        pk: int,
        knowledge_ids: List[int] = None,
        quiz_ids: List[int] = None,
        assignee_ids: List[int] = None,
        **kwargs,
    ) -> Task:
        task = self.get_task_by_id(pk)
        enforce('task.update', self.request, resource=task, error_message='无权更新任务')
        if task.deadline <= timezone.now():
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='任务已截止，无法修改',
            )

        knowledge_objs = (
            self._load_scoped_knowledge(knowledge_ids)
            if knowledge_ids is not None
            else None
        )
        quiz_objs = self._load_scoped_quizzes(quiz_ids) if quiz_ids is not None else None
        if assignee_ids is not None:
            if not assignee_ids:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message='请至少选择一名指派人员',
                )
            assignee_ids = self._ensure_valid_assignee_ids(assignee_ids)
        if knowledge_objs is not None and quiz_objs is not None and not knowledge_objs and not quiz_objs:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一个知识文档或试卷',
            )

        has_progress = task.has_student_progress
        if has_progress:
            if knowledge_ids is not None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有人员开始执行，无法修改知识文档',
                )
            if quiz_ids is not None:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有人员开始执行，无法修改试卷',
                )
            if assignee_ids is not None:
                existing_ids = set(task.assignments.values_list('assignee_id', flat=True))
                removed_ids = existing_ids - set(assignee_ids)
                if removed_ids:
                    raise BusinessError(
                        code=ErrorCodes.INVALID_OPERATION,
                        message='任务已有人员开始执行，无法移除已分配的学员',
                    )

        if kwargs:
            for key, value in kwargs.items():
                setattr(task, key, value)
        task.updated_by = self.user
        task.save(update_fields=[*kwargs.keys(), 'updated_by'])
        if knowledge_objs is not None:
            self._sync_task_knowledge(task, knowledge_objs)
        if quiz_objs is not None:
            self._sync_task_quizzes(task, quiz_objs)
        if assignee_ids is not None:
            self._update_assignments(task, assignee_ids)
        return task

    @log_operation(
        'task_management',
        'delete_task',
        group='任务管理',
        label='删除任务',
        build_event=_delete_task_event,
    )
    def delete_task(self, pk: int) -> SimpleNamespace:
        task = self.get_task_by_id(pk)
        enforce('task.delete', self.request, resource=task, error_message='无权删除任务')
        snapshot = SimpleNamespace(
            id=task.id,
            title=task.title,
            knowledge_count=task.task_knowledge.count(),
            quiz_count=task.task_quizzes.count(),
            assignee_count=task.assignments.count(),
        )
        self.hard_delete_tasks([task.id])
        return snapshot

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

        with transaction.atomic():
            Submission.objects.filter(task_assignment__task_id__in=normalized_ids).delete()
            Task.objects.filter(id__in=normalized_ids).delete()

    def _dedupe_ids(self, resource_ids: List[int]) -> List[int]:
        seen = set()
        ordered = []
        for resource_id in resource_ids:
            if resource_id in seen:
                continue
            seen.add(resource_id)
            ordered.append(resource_id)
        return ordered

    def _load_scoped_knowledge(self, knowledge_ids: List[int]) -> List[Knowledge]:
        normalized_ids = self._dedupe_ids(knowledge_ids)
        if not normalized_ids:
            return []
        queryset = scope_filter(
            'knowledge.view',
            self.request,
            base_queryset=Knowledge.objects.filter(id__in=normalized_ids),
        ).prefetch_related('tags')
        knowledge_map = {item.id: item for item in queryset}
        missing = sorted(set(normalized_ids) - set(knowledge_map))
        if missing:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'知识文档不存在: {missing}',
            )
        return [knowledge_map[item_id] for item_id in normalized_ids]

    def _load_scoped_quizzes(self, quiz_ids: List[int]) -> List[Quiz]:
        normalized_ids = self._dedupe_ids(quiz_ids)
        if not normalized_ids:
            return []
        queryset = scope_filter(
            'quiz.view',
            self.request,
            base_queryset=Quiz.objects.filter(id__in=normalized_ids),
        ).prefetch_related(
            'quiz_questions__question_options',
            'quiz_questions__question__tags',
            'quiz_questions__question__space_tag',
        )
        quiz_map = {item.id: item for item in queryset}
        missing = sorted(set(normalized_ids) - set(quiz_map))
        if missing:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message=f'试卷不存在: {missing}',
            )
        return [quiz_map[item_id] for item_id in normalized_ids]

    def _ensure_valid_assignee_ids(self, assignee_ids: List[int]) -> List[int]:
        normalized_ids = self._dedupe_ids(assignee_ids)
        if not normalized_ids:
            return []
        existing_ids = set(
            User.objects.filter(
                id__in=normalized_ids,
                is_active=True,
                roles__code='STUDENT',
            ).distinct().values_list('id', flat=True)
        )
        invalid_ids = sorted(set(normalized_ids) - existing_ids)
        if invalid_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f'指派人员不存在、已停用或不可执行任务: {invalid_ids}',
            )
        enforce_assignable_students_scope(normalized_ids, self.request)
        return normalized_ids

    def _bulk_create_assignments(self, task_id: int, assignee_ids: List[int]) -> List[TaskAssignment]:
        if not assignee_ids:
            return []
        assignments = [
            TaskAssignment(task_id=task_id, assignee_id=assignee_id, status='IN_PROGRESS')
            for assignee_id in assignee_ids
        ]
        return TaskAssignment.objects.bulk_create(assignments, batch_size=500)

    def _create_knowledge_associations(self, task: Task, knowledge_objs: List[Knowledge]) -> None:
        associations = []
        for order, knowledge in enumerate(knowledge_objs, start=1):
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

    def _create_quiz_associations(self, task: Task, quiz_objs: List[Quiz]) -> None:
        associations = []
        for order, quiz in enumerate(quiz_objs, start=1):
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

    def _sync_task_knowledge(self, task: Task, knowledge_objs: List[Knowledge]) -> None:
        desired_ids = [item.id for item in knowledge_objs]
        TaskKnowledge.objects.filter(task_id=task.id).exclude(
            source_knowledge_id__in=desired_ids
        ).delete()
        remaining = {
            item.source_knowledge_id: item
            for item in TaskKnowledge.objects.filter(task_id=task.id)
            if item.source_knowledge_id is not None
        }
        self._rewrite_association_orders(
            model=TaskKnowledge,
            remaining_by_source=remaining,
            desired_ids=desired_ids,
            create_for_source=lambda source_id, order: self._build_knowledge_assoc(
                task, knowledge_objs, source_id, order
            ),
        )

    def _sync_task_quizzes(self, task: Task, quiz_objs: List[Quiz]) -> None:
        desired_ids = [item.id for item in quiz_objs]
        TaskQuiz.objects.filter(task_id=task.id).exclude(
            source_quiz_id__in=desired_ids
        ).delete()
        remaining = {
            item.source_quiz_id: item
            for item in TaskQuiz.objects.filter(task_id=task.id)
            if item.source_quiz_id is not None
        }
        self._rewrite_association_orders(
            model=TaskQuiz,
            remaining_by_source=remaining,
            desired_ids=desired_ids,
            create_for_source=lambda source_id, order: self._build_quiz_assoc(
                task, quiz_objs, source_id, order
            ),
        )

    def _build_knowledge_assoc(
        self,
        task: Task,
        knowledge_objs: List[Knowledge],
        source_id: int,
        order: int,
    ) -> TaskKnowledge:
        knowledge = next(item for item in knowledge_objs if item.id == source_id)
        revision = ensure_knowledge_revision(knowledge, actor=self.user)
        return TaskKnowledge(
            task=task,
            knowledge=revision,
            source_knowledge=knowledge,
            order=order,
        )

    def _build_quiz_assoc(
        self,
        task: Task,
        quiz_objs: List[Quiz],
        source_id: int,
        order: int,
    ) -> TaskQuiz:
        quiz = next(item for item in quiz_objs if item.id == source_id)
        revision = ensure_quiz_revision(quiz, actor=self.user)
        return TaskQuiz(
            task=task,
            quiz=revision,
            source_quiz=quiz,
            order=order,
        )

    def _rewrite_association_orders(
        self,
        *,
        model,
        remaining_by_source: dict[int, Any],
        desired_ids: List[int],
        create_for_source,
    ) -> None:
        if remaining_by_source:
            for index, item in enumerate(remaining_by_source.values(), start=1):
                item.order = ORDER_OFFSET + index
            model.objects.bulk_update(list(remaining_by_source.values()), ['order'])

        updates = []
        creates = []
        for order, source_id in enumerate(desired_ids, start=1):
            existing = remaining_by_source.get(source_id)
            if existing is not None:
                existing.order = order
                updates.append(existing)
            else:
                creates.append(create_for_source(source_id, order))
        if updates:
            model.objects.bulk_update(updates, ['order'])
        if creates:
            model.objects.bulk_create(creates, batch_size=500)

    def _update_assignments(self, task: Task, assignee_ids: List[int]) -> None:
        existing_assignments = TaskAssignment.objects.filter(task_id=task.id)
        existing_ids = set(existing_assignments.values_list('assignee_id', flat=True))
        new_ids = set(assignee_ids)
        to_remove = existing_ids - new_ids
        if to_remove:
            existing_assignments.filter(assignee_id__in=to_remove).delete()
        to_add = new_ids - existing_ids
        self._bulk_create_assignments(task_id=task.id, assignee_ids=list(to_add))


class StudentTaskService(BaseService):
    """学员任务执行。"""

    def get_student_assignment(self, task_id: int) -> TaskAssignment:
        enforce_student_workspace(self.request, error_message='只有学员可以访问任务执行')
        assignment = assignment_detail_queryset().filter(
            task_id=task_id,
            assignee_id=self.user.id,
        ).first()
        self.validate_not_none(assignment, '任务不存在或未分配给您')
        sync_assignment_overdue_status(assignment)
        return assignment

    def get_student_task_detail(self, task_id: int) -> TaskAssignment:
        """加载学员任务详情并附带已计算字段，Serializer 不再查业务。"""
        assignment = self.get_student_assignment(task_id)
        assignment.progress_payload = build_assignment_progress(assignment)
        assignment.knowledge_items_payload = self.build_student_knowledge_items(assignment)
        assignment.quiz_items_payload = self.build_student_quiz_items(assignment)
        return assignment

    @log_operation(
        'learning',
        'complete_knowledge',
        group='学习进度',
        label='完成学习',
        build_event=_complete_knowledge_event,
    )
    def complete_knowledge_learning(
        self,
        assignment: TaskAssignment,
        task_knowledge_id: int,
    ) -> KnowledgeLearningProgress:
        enforce_student_workspace(self.request, error_message='只有学员可以完成知识学习')
        sync_assignment_overdue_status(assignment)
        if assignment.status == 'COMPLETED':
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='任务已完成')
        if assignment.status == 'OVERDUE':
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='任务已逾期，无法继续学习')
        task_knowledge = task_knowledge_queryset(assignment.task.id).filter(
            id=task_knowledge_id
        ).first()
        if not task_knowledge:
            raise BusinessError(
                code=ErrorCodes.RESOURCE_NOT_FOUND,
                message='该任务知识不在此任务中',
            )
        progress, _ = KnowledgeLearningProgress.objects.get_or_create(
            assignment_id=assignment.id,
            task_knowledge_id=task_knowledge.id,
            defaults={'is_completed': False, 'started_at': timezone.now()},
        )
        if progress.is_completed:
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='该知识已标记为已学习')
        now = timezone.now()
        if progress.started_at is None:
            progress.started_at = now
        progress.is_completed = True
        progress.completed_at = now
        progress.save(update_fields=['is_completed', 'started_at', 'completed_at'])
        getattr(assignment, '_prefetched_objects_cache', {}).pop('knowledge_progress', None)
        sync_assignment_completion_status(assignment)
        return progress

    @staticmethod
    def build_student_knowledge_items(assignment: TaskAssignment) -> List[dict]:
        task_knowledge_items = task_knowledge_queryset(assignment.task.id)
        progress_map = {
            item.task_knowledge_id: item
            for item in knowledge_progress_queryset(assignment.id)
        }
        result = []
        for task_knowledge in task_knowledge_items:
            progress = progress_map.get(task_knowledge.id)
            knowledge = task_knowledge.knowledge
            preview = knowledge.content_preview or ''
            result.append(
                {
                    'id': task_knowledge.id,
                    'knowledge_id': task_knowledge.source_knowledge_id,
                    'knowledge_revision_id': task_knowledge.knowledge_id,
                    'title': knowledge.title,
                    'space_tag_name': knowledge.space_tag_name or None,
                    'content_preview': preview[:160],
                    'order': task_knowledge.order,
                    'is_completed': progress.is_completed if progress else False,
                    'completed_at': progress.completed_at if progress else None,
                }
            )
        return sorted(result, key=lambda item: item['order'])

    @staticmethod
    def build_student_quiz_items(assignment: TaskAssignment) -> List[dict]:
        task_quiz_items = task_quiz_queryset(assignment.task.id)
        submissions = Submission.objects.filter(
            task_assignment_id=assignment.id,
            status__in=QUIZ_COMPLETION_STATUSES,
        ).select_related('quiz')
        submission_map: dict[int, list] = {}
        for submission in submissions:
            submission_map.setdefault(submission.task_quiz_id, []).append(submission)

        result = []
        for task_quiz in task_quiz_items:
            quiz = task_quiz.quiz
            quiz_subs = submission_map.get(task_quiz.id, [])
            is_completed = len(quiz_subs) > 0
            best_sub = (
                max(quiz_subs, key=lambda item: item.obtained_score or 0)
                if is_completed
                else None
            )
            latest_sub = (
                max(quiz_subs, key=lambda item: item.submitted_at)
                if is_completed
                else None
            )
            question_count = getattr(task_quiz, 'question_count_value', None)
            if question_count is None:
                question_count = quiz.question_count
            total_score = getattr(task_quiz, 'total_score_value', None)
            if total_score is None:
                total_score = quiz.total_score
            result.append(
                {
                    'task_quiz_id': task_quiz.id,
                    'quiz_revision_id': task_quiz.quiz_id,
                    'quiz_title': quiz.title,
                    'quiz_type': quiz.quiz_type,
                    'quiz_type_display': quiz.get_quiz_type_display(),
                    'question_count': question_count,
                    'total_score': float(total_score) if total_score else 0,
                    'duration': quiz.duration,
                    'pass_score': float(quiz.pass_score) if quiz.pass_score else None,
                    'order': task_quiz.order,
                    'is_completed': is_completed,
                    'score': (
                        float(best_sub.obtained_score)
                        if best_sub and best_sub.obtained_score is not None
                        else None
                    ),
                    'latest_submission_id': latest_sub.id if latest_sub else None,
                    'latest_status': latest_sub.status if latest_sub else None,
                }
            )
        return sorted(result, key=lambda item: item['order'])

    def get_student_assignments_queryset(
        self,
        status_filter: str = None,
        search: str = None,
    ) -> QuerySet:
        enforce_student_workspace(self.request, error_message='只有学员可以访问任务列表')
        qs = assignment_list_queryset().filter(assignee_id=self.user.id)
        if status_filter:
            if status_filter not in STUDENT_TASK_LIST_STATUSES:
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='任务状态无效')
            qs = self._filter_by_execution_status(qs, status_filter)
        if search:
            qs = qs.filter(task__title__icontains=search)
        return qs.order_by('-task__deadline')

    @staticmethod
    def _with_execution_status_flags(qs: QuerySet) -> QuerySet:
        started_knowledge = KnowledgeLearningProgress.objects.filter(
            assignment_id=OuterRef('pk'),
        ).filter(
            Q(started_at__isnull=False)
            | Q(completed_at__isnull=False)
            | Q(is_completed=True)
        )
        submissions = Submission.objects.filter(task_assignment_id=OuterRef('pk'))
        grading_submissions = submissions.filter(status='GRADING')
        return qs.annotate(
            has_started_knowledge=Exists(started_knowledge),
            has_submission=Exists(submissions),
            has_grading_submission=Exists(grading_submissions),
        )

    def _filter_by_execution_status(self, qs: QuerySet, status_filter: str) -> QuerySet:
        now = timezone.now()
        if status_filter == 'COMPLETED':
            return qs.filter(status='COMPLETED')
        if status_filter == 'OVERDUE':
            return self._with_execution_status_flags(
                qs.filter(Q(status='OVERDUE') | Q(status='IN_PROGRESS', task__deadline__lt=now))
            ).filter(has_grading_submission=False)

        qs = self._with_execution_status_flags(qs.filter(status='IN_PROGRESS'))
        if status_filter == 'PENDING_GRADING':
            return qs.filter(has_grading_submission=True)
        if status_filter == 'NOT_STARTED':
            return qs.filter(
                task__deadline__gte=now,
                has_grading_submission=False,
                has_started_knowledge=False,
                has_submission=False,
            )
        return qs.filter(
            task__deadline__gte=now,
            has_grading_submission=False,
        ).filter(
            Q(has_started_knowledge=True) | Q(has_submission=True)
        )
