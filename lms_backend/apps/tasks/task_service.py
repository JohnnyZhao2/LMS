"""Task management service."""

from decimal import Decimal
from types import SimpleNamespace
from typing import Any, List, Optional, Tuple

from django.db import transaction
from django.db.models import QuerySet

from apps.authorization.engine import get_engine
from apps.activity_logs.decorators import log_operation
from apps.activity_logs.text import format_datetime
from apps.knowledge.models import Knowledge
from apps.knowledge.services import ensure_knowledge_revision
from apps.quizzes.models import Quiz
from apps.quizzes.services import freeze_quiz_for_task
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .models import Task, TaskAssignment, TaskKnowledge, TaskQuiz
from .policies import enforce_assignable_students_scope
from .selectors import task_detail_queryset, task_list_queryset


def _create_task_log_description(ctx: dict) -> str:
    task = ctx['result']
    return (
        f'截止 {format_datetime(ctx.get("deadline"))}，'
        f'{task.knowledge_count} 篇知识，{task.quiz_count} 份试卷，{task.assignee_count} 名人员'
    )


def _update_task_log_description(ctx: dict) -> str:
    parts = []
    if 'title' in ctx:
        parts.append('任务标题')
    if 'description' in ctx:
        parts.append('任务说明')
    if 'deadline' in ctx:
        parts.append(f'截止时间调整为 {format_datetime(ctx.get("deadline"))}')
    if ctx.get('knowledge_ids') is not None:
        parts.append(f'关联知识调整为 {len(ctx["knowledge_ids"])} 篇')
    if ctx.get('quiz_ids') is not None:
        parts.append(f'关联试卷调整为 {len(ctx["quiz_ids"])} 份')
    if ctx.get('quiz_pass_scores'):
        parts.append('考试及格分数已调整')
    if ctx.get('assignee_ids') is not None:
        parts.append(f'分配学员调整为 {len(ctx["assignee_ids"])} 名')
    return '；'.join(parts) if parts else '任务配置已调整'


class TaskService(BaseService):
    """任务发布、编辑、删除的业务编排。

    这里负责把“当前资源”转换为“任务执行快照”，并维护任务分配约束。
    列表读取尽量走 selectors，权限范围统一走 authorization engine。
    """

    def get_task_queryset_for_user(self) -> QuerySet:
        qs = task_list_queryset().filter(is_archived=False)
        return get_engine(self.request).scope_filter('tasks.view_task', base_queryset=qs)

    def filter_task_queryset_by_creator_side(
        self,
        queryset: QuerySet,
        creator_side: Optional[str],
    ) -> QuerySet:
        if not creator_side or creator_side == 'all':
            return queryset
        if not get_engine(self.request).has_permission('users.view_user'):
            return queryset
        if creator_side == 'management':
            return queryset.filter(created_by_admin=True)
        if creator_side == 'non_management':
            return queryset.filter(created_by_admin=False)
        raise BusinessError(
            code=ErrorCodes.INVALID_INPUT,
            message='creator_side 参数无效，仅支持 all、management、non_management',
        )

    def get_task_by_id(self, pk: int) -> Task:
        task = task_detail_queryset().filter(pk=pk).first()
        self.validate_not_none(task, f'任务 {pk} 不存在')
        return task

    def check_task_read_permission(self, task: Task) -> bool:
        get_engine(self.request).enforce('tasks.view_task', resource=task, error_message='无权访问此任务')
        return True

    def check_task_edit_permission(self, task: Task, permission_code: str, error_message: str) -> bool:
        get_engine(self.request).enforce(permission_code, resource=task, error_message=error_message)
        return True

    @transaction.atomic
    @log_operation(
        'task_management',
        'create_and_assign',
        _create_task_log_description,
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
        quizzes: List[dict] = None,
        assignee_ids: List[int] = None,
    ) -> Task:
        knowledge_ids = knowledge_ids or []
        seen_quizzes = {}
        for item in quizzes or []:
            seen_quizzes.setdefault(
                item['id'],
                {
                    'id': item['id'],
                    'allow_retry': bool(item['allow_retry']),
                    'duration': item.get('duration'),
                    'pass_score': item.get('pass_score'),
                },
            )
        quizzes = list(seen_quizzes.values())
        assignee_ids = assignee_ids or []
        get_engine(self.request).enforce('tasks.add_task', error_message='无权创建任务')
        self._validate_create_payload(knowledge_ids, quizzes, assignee_ids)

        task = Task.objects.create(
            title=title,
            description=description,
            deadline=deadline,
            created_by_admin=self.user.is_admin,
            created_by=self.user,
            updated_by=self.user,
        )
        if knowledge_ids:
            self._create_knowledge_associations(task, knowledge_ids)
        if quizzes:
            self._create_quiz_associations(task, quizzes)
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
        return list(dict.fromkeys(resource_ids))

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
            # 发布任务时冻结当前知识内容；任务执行链路只读 revision。
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

    def _create_quiz_associations(self, task: Task, quizzes: List[dict]) -> None:
        quiz_map = {
            quiz.id: quiz
            for quiz in get_engine(self.request).scope_filter('quizzes.view_quiz',
                base_queryset=Quiz.objects.filter(id__in=[item['id'] for item in quizzes]),
            ).prefetch_related(
                'quiz_questions__question__question_options',
            )
        }
        for order, item in enumerate(quizzes, start=1):
            quiz = quiz_map.get(item['id'])
            if quiz is None:
                raise BusinessError(
                    code=ErrorCodes.RESOURCE_NOT_FOUND,
                    message=f'试卷 {item["id"]} 不存在',
                )
            freeze_quiz_for_task(
                quiz,
                task=task,
                order=order,
                allow_retry=item['allow_retry'],
                duration=item.get('duration'),
                pass_score=item.get('pass_score'),
            )

    @transaction.atomic
    @log_operation(
        'task_management',
        'update_task',
        _update_task_log_description,
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
        quiz_pass_scores: List[dict] = None,
        assignee_ids: List[int] = None,
        **kwargs,
    ) -> Task:
        self._validate_update_payload(knowledge_ids, quiz_ids, assignee_ids)
        if knowledge_ids is not None:
            existing_ids = list(
                TaskKnowledge.objects.filter(task_id=task.id)
                .order_by('order')
                .values_list('source_knowledge_id', flat=True)
            )
            if existing_ids != self._dedupe_resource_ids(knowledge_ids):
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务创建后无法修改知识文档，请创建新任务',
                )
        if quiz_ids is not None:
            existing_ids = list(task.task_quizzes.order_by('order', 'id').values_list('source_quiz_id', flat=True))
            if existing_ids != self._dedupe_resource_ids(quiz_ids):
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务创建后无法修改试卷，请创建新任务',
                )
        if task.has_student_progress and assignee_ids is not None:
            existing_ids = set(task.assignments.values_list('assignee_id', flat=True))
            removed_ids = existing_ids - set(assignee_ids)
            if removed_ids:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message='任务已有人员开始执行，无法移除已分配的学员',
                )
        if quiz_pass_scores is not None:
            self._update_quiz_pass_scores(task, quiz_pass_scores)
        if kwargs:
            for key, value in kwargs.items():
                setattr(task, key, value)
        task.updated_by = self.user
        task.save(update_fields=[*kwargs.keys(), 'updated_by'])
        if assignee_ids is not None:
            self._update_assignments(task, assignee_ids)
        return task

    def _update_quiz_pass_scores(self, task: Task, quiz_pass_scores: List[dict]) -> None:
        if not quiz_pass_scores:
            return
        task_quiz_map = {tq.id: tq for tq in task.task_quizzes.all()}
        for item in quiz_pass_scores:
            task_quiz_id = item['task_quiz_id']
            task_quiz = task_quiz_map.get(task_quiz_id)
            if task_quiz is None:
                raise BusinessError(
                    code=ErrorCodes.RESOURCE_NOT_FOUND,
                    message=f'任务试卷 {task_quiz_id} 不存在',
                )
            if task_quiz.allow_retry:
                raise BusinessError(
                    code=ErrorCodes.INVALID_OPERATION,
                    message=f'测验「{task_quiz.title}」不支持设置及格分数',
                )
            new_pass_score = Decimal(str(item['pass_score']))
            if new_pass_score <= 0:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'考试「{task_quiz.title}」的及格分数必须大于 0',
                )
            total_score = Decimal(str(task_quiz.total_score or 0))
            if total_score > 0 and new_pass_score > total_score:
                raise BusinessError(
                    code=ErrorCodes.VALIDATION_ERROR,
                    message=f'考试「{task_quiz.title}」的及格分数不能超过试卷总分 {total_score}',
                )
            if task_quiz.pass_score != new_pass_score:
                task_quiz.pass_score = new_pass_score
                task_quiz.save(update_fields=['pass_score'])

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
        '{result.knowledge_count} 篇知识，{result.quiz_count} 份试卷，{result.assignee_count} 名人员',
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
        task.is_archived = True
        task.save(update_fields=['is_archived'])
        return snapshot

    def _ensure_valid_resource_ids(self, resource_ids: List[int], resource_model: Any, resource_label: str) -> List[int]:
        normalized_ids = self._dedupe_resource_ids(resource_ids)
        queryset = resource_model.objects.all()
        if resource_model is Quiz:
            queryset = get_engine(self.request).scope_filter('quizzes.view_quiz', base_queryset=queryset)
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
                message=f'指派人员不存在、已停用或不可执行任务: {invalid_ids}',
            )
        enforce_assignable_students_scope(normalized_ids, self.request)
        return normalized_ids

    def _validate_create_payload(
        self,
        knowledge_ids: List[int],
        quizzes: List[dict],
        assignee_ids: List[int],
    ) -> None:
        if not knowledge_ids and not quizzes:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一个知识文档或试卷',
            )
        if not assignee_ids:
            raise BusinessError(
                code=ErrorCodes.VALIDATION_ERROR,
                message='请至少选择一名指派人员',
            )
        self._ensure_valid_resource_ids(knowledge_ids, Knowledge, '知识文档')
        self._ensure_valid_resource_ids([item['id'] for item in quizzes], Quiz, '试卷')
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
                    message='请至少选择一名指派人员',
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
    def validate_assignee_ids(assignee_ids: List[int]) -> Tuple[bool, List[int]]:
        if not assignee_ids:
            return False, []
        from apps.authorization.roles import learning_member_queryset

        existing_ids = set(
            learning_member_queryset().filter(id__in=assignee_ids).values_list('id', flat=True)
        )
        invalid_ids = list(set(assignee_ids) - existing_ids)
        return len(invalid_ids) == 0, invalid_ids
