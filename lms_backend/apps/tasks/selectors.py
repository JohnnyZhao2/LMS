"""Task selectors."""

from typing import Any, Iterable, Optional

from django.db.models import Count, DecimalField, Prefetch, Q, QuerySet, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.authorization.engine import get_engine
from apps.knowledge.selectors import get_knowledge_queryset
from apps.quizzes.models import Quiz
from apps.quizzes.services import annotate_quiz_summary
from apps.submissions.models import Submission
from apps.submissions.scoring import submission_recency_key

from .models import KnowledgeLearningProgress, Task, TaskAssignment, TaskKnowledge, TaskQuiz

ANALYTICS_SUBMISSION_STATUSES = ['SUBMITTED', 'GRADING', 'GRADED']
TASK_EXECUTION_STATUS_LABELS = {
    'NOT_STARTED': '未开始',
    'IN_PROGRESS': '进行中',
    'PENDING_GRADING': '待批改',
    'COMPLETED': '已完成',
    'OVERDUE': '已逾期',
}


def _annotated_task_quiz_queryset() -> QuerySet:
    return TaskQuiz.objects.select_related('source_quiz', 'task').annotate(
        question_count_value=Count('quiz_questions', distinct=True),
        total_score_value=Coalesce(
            Sum('quiz_questions__score'),
            Value(0),
            output_field=DecimalField(max_digits=10, decimal_places=2),
        ),
    ).order_by('order')


def get_task_for_access(pk: int, *, include_archived: bool = False) -> Optional[Task]:
    queryset = Task.objects.select_related('created_by').filter(pk=pk)
    if not include_archived:
        queryset = queryset.filter(is_archived=False)
    return queryset.first()


def task_detail_queryset() -> QuerySet:
    return Task.objects.select_related('created_by', 'updated_by').prefetch_related(
        'task_knowledge__knowledge',
        'task_knowledge__source_knowledge',
        Prefetch('task_quizzes', queryset=_annotated_task_quiz_queryset()),
        'assignments__assignee',
    )


def task_list_queryset() -> QuerySet:
    return Task.objects.select_related('created_by', 'updated_by')


def _latest_quiz_statuses_by_assignment(
    assignment_ids: list[int],
    *,
    statuses: Optional[tuple[str, ...]] = None,
) -> tuple[dict[tuple[int, int], str], dict[int, set[int]]]:
    """扫描候选分配下的提交记录，返回每个 (assignment_id, task_quiz_id) 的最新状态及已完成试卷集合。"""
    queryset = Submission.objects.filter(task_assignment_id__in=assignment_ids)
    if statuses is not None:
        queryset = queryset.filter(status__in=statuses)
    latest_by_quiz: dict[tuple[int, int], tuple[tuple, str]] = {}
    completed_quizzes: dict[int, set[int]] = {}
    for sub_id, assignment_id, quiz_id, status, attempt_number, submitted_at in queryset.values_list(
        'id',
        'task_assignment_id',
        'task_quiz_id',
        'status',
        'attempt_number',
        'submitted_at',
    ):
        key = (assignment_id, quiz_id)
        rank = submission_recency_key(status, attempt_number, submitted_at, sub_id)
        prev = latest_by_quiz.get(key)
        if prev is None or rank > prev[0]:
            latest_by_quiz[key] = (rank, status)
        if status in ('SUBMITTED', 'GRADED'):
            completed_quizzes.setdefault(assignment_id, set()).add(quiz_id)
    return (
        {key: status for key, (_, status) in latest_by_quiz.items()},
        completed_quizzes,
    )


def get_task_list_metrics(task_ids: Iterable[int]) -> dict[int, dict[str, int]]:
    """按当前页任务 ID 批量计算列表统计，避免三表联合 Count 笛卡尔积与全量 ORM Prefetch。"""
    id_list = list(task_ids)
    if not id_list:
        return {}

    metrics: dict[int, dict[str, int]] = {
        tid: {
            'knowledge_count': 0,
            'quiz_count': 0,
            'assignee_count': 0,
            'completed_count': 0,
            'pending_grading_count': 0,
            'abnormal_count': 0,
        }
        for tid in id_list
    }

    for row in TaskKnowledge.objects.filter(task_id__in=id_list).values('task_id').annotate(cnt=Count('id')):
        metrics[row['task_id']]['knowledge_count'] = row['cnt']

    for row in TaskQuiz.objects.filter(task_id__in=id_list).values('task_id').annotate(cnt=Count('id')):
        metrics[row['task_id']]['quiz_count'] = row['cnt']

    for row in (
        TaskAssignment.objects.filter(task_id__in=id_list)
        .values('task_id')
        .annotate(
            assignee_count=Count('id'),
            completed_count=Count('id', filter=Q(status='COMPLETED')),
        )
    ):
        metrics[row['task_id']]['assignee_count'] = row['assignee_count']
        metrics[row['task_id']]['completed_count'] = row['completed_count']

    grading_assignment_tasks = dict(
        Submission.objects.filter(
            task_assignment__task_id__in=id_list,
            status='GRADING',
        ).values_list('task_assignment_id', 'task_assignment__task_id').distinct()
    )
    if grading_assignment_tasks:
        latest_statuses, _ = _latest_quiz_statuses_by_assignment(
            list(grading_assignment_tasks.keys()),
            statuses=ANALYTICS_SUBMISSION_STATUSES,
        )
        for (assignment_id, _), status in latest_statuses.items():
            if status == 'GRADING':
                metrics[grading_assignment_tasks[assignment_id]]['pending_grading_count'] += 1

    abnormal_assignees: dict[int, set[int]] = {}
    for (
        task_id,
        assignee_id,
        submitted_at,
        started_at,
        duration,
    ) in Submission.objects.filter(
        task_assignment__task_id__in=id_list,
        status__in=ANALYTICS_SUBMISSION_STATUSES,
        task_quiz__allow_retry=False,
        task_quiz__duration__isnull=False,
        started_at__isnull=False,
        submitted_at__isnull=False,
    ).values_list(
        'task_assignment__task_id',
        'task_assignment__assignee_id',
        'submitted_at',
        'started_at',
        'task_quiz__duration',
    ):
        if _is_exam_duration_abnormal(False, duration, started_at, submitted_at):
            abnormal_assignees.setdefault(task_id, set()).add(assignee_id)
    for task_id, assignee_ids in abnormal_assignees.items():
        metrics[task_id]['abnormal_count'] = len(assignee_ids)

    return metrics


def assignment_detail_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee',
    ).prefetch_related(
        Prefetch(
            'task__task_knowledge',
            queryset=TaskKnowledge.objects.select_related('knowledge', 'source_knowledge').order_by('order'),
        ),
        Prefetch(
            'task__task_quizzes',
            queryset=_annotated_task_quiz_queryset(),
        ),
        Prefetch(
            'knowledge_progress',
            queryset=KnowledgeLearningProgress.objects.select_related(
                'task_knowledge',
                'task_knowledge__knowledge',
            ).order_by('task_knowledge__order'),
        ),
    )


def assignment_list_queryset() -> QuerySet:
    return TaskAssignment.objects.select_related(
        'task',
        'task__created_by',
        'task__updated_by',
        'assignee',
    ).prefetch_related(
        'task__task_knowledge__knowledge',
        'task__task_quizzes',
        'knowledge_progress',
    )


def task_knowledge_queryset(task_id: int) -> QuerySet:
    return TaskKnowledge.objects.filter(task_id=task_id).select_related(
        'knowledge',
        'source_knowledge',
        'task',
    ).order_by('order')


def task_quiz_queryset(task_id: int) -> QuerySet:
    return _annotated_task_quiz_queryset().filter(task_id=task_id)


def task_resource_options(
    *,
    request,
    search: Optional[str] = None,
    resource_type: str = 'ALL',
    exclude_document_ids: Optional[set[int]] = None,
    exclude_quiz_ids: Optional[set[int]] = None,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    exclude_document_ids = exclude_document_ids or set()
    exclude_quiz_ids = exclude_quiz_ids or set()

    if resource_type in {'ALL', 'DOCUMENT'}:
        knowledge_rows = get_knowledge_queryset(
            search=search,
            ordering='-updated_at',
        )
        if exclude_document_ids:
            knowledge_rows = knowledge_rows.exclude(id__in=exclude_document_ids)
        knowledge_rows = knowledge_rows.values('id', 'title', 'updated_at', 'space_tag__name')
        items.extend(
            [
                {
                    'id': row['id'],
                    'title': row['title'],
                    'resource_type': 'DOCUMENT',
                    'space_tag_name': row['space_tag__name'],
                    'updated_at': row['updated_at'],
                }
                for row in knowledge_rows
            ]
        )

    if resource_type in {'ALL', 'QUIZ'}:
        quiz_rows = annotate_quiz_summary(
            get_engine(request).scope_filter(
                'quizzes.view_quiz',
                base_queryset=Quiz.objects.all(),
            )
        )
        if exclude_quiz_ids:
            quiz_rows = quiz_rows.exclude(id__in=exclude_quiz_ids)
        quiz_rows = quiz_rows.values(
            'id',
            'title',
            'updated_at',
            'question_count_value',
            'total_score_value',
        ).order_by('-updated_at')
        if search:
            quiz_rows = quiz_rows.filter(title__icontains=search)
        items.extend(
            [
                {
                    'id': row['id'],
                    'title': row['title'],
                    'resource_type': 'QUIZ',
                    'question_count': row['question_count_value'],
                    'total_score': row['total_score_value'],
                    'updated_at': row['updated_at'],
                }
                for row in quiz_rows
            ]
        )

    items.sort(key=lambda item: item['updated_at'], reverse=True)
    for item in items:
        item.pop('updated_at', None)
    return items


def knowledge_progress_queryset(assignment_id: int) -> QuerySet:
    return KnowledgeLearningProgress.objects.filter(assignment_id=assignment_id).select_related(
        'task_knowledge',
        'task_knowledge__knowledge',
    ).order_by('task_knowledge__order')


def get_pending_grading_assignment_ids(assignment_ids: Iterable[int]) -> set[int]:
    """判断哪些分配「其余节点均已完成，仅剩最新提交为 GRADING 的试卷」。"""
    id_list = list(assignment_ids)
    if not id_list:
        return set()
    candidate_ids = list(
        Submission.objects.filter(
            task_assignment_id__in=id_list,
            status='GRADING',
        ).values_list('task_assignment_id', flat=True).distinct()
    )
    if not candidate_ids:
        return set()
    latest_statuses, completed_quizzes = _latest_quiz_statuses_by_assignment(candidate_ids)

    grading_quizzes: dict[int, set[int]] = {}
    for (assignment_id, quiz_id), status in latest_statuses.items():
        if status == 'GRADING':
            grading_quizzes.setdefault(assignment_id, set()).add(quiz_id)
    if not grading_quizzes:
        return set()

    grading_assignment_ids = list(grading_quizzes.keys())
    assignment_task_map = dict(
        TaskAssignment.objects.filter(id__in=grading_assignment_ids).values_list('id', 'task_id')
    )
    task_ids = set(assignment_task_map.values())
    total_knowledge_by_task = dict(
        TaskKnowledge.objects.filter(task_id__in=task_ids)
        .values('task_id')
        .annotate(cnt=Count('id'))
        .values_list('task_id', 'cnt')
    )
    total_quizzes_by_task = dict(
        TaskQuiz.objects.filter(task_id__in=task_ids)
        .values('task_id')
        .annotate(cnt=Count('id'))
        .values_list('task_id', 'cnt')
    )
    completed_knowledge_by_assignment = dict(
        KnowledgeLearningProgress.objects.filter(
            assignment_id__in=grading_assignment_ids,
            is_completed=True,
        )
        .values('assignment_id')
        .annotate(cnt=Count('id'))
        .values_list('assignment_id', 'cnt')
    )

    result: set[int] = set()
    for assignment_id in grading_assignment_ids:
        task_id = assignment_task_map.get(assignment_id)
        if task_id is None:
            continue
        if completed_knowledge_by_assignment.get(assignment_id, 0) < total_knowledge_by_task.get(task_id, 0):
            continue
        covered_quizzes = completed_quizzes.get(assignment_id, set()) | grading_quizzes[assignment_id]
        if len(covered_quizzes) < total_quizzes_by_task.get(task_id, 0):
            continue
        result.add(assignment_id)
    return result


def get_started_assignment_ids(assignment_ids: Iterable[int]) -> set[int]:
    id_list = list(assignment_ids)
    if not id_list:
        return set()
    return set(
        Submission.objects.filter(task_assignment_id__in=id_list)
        .values_list('task_assignment_id', flat=True)
        .distinct()
    )


def assignment_has_pending_grading(
    assignment: TaskAssignment,
    *,
    pending_grading_ids: Optional[set[int]] = None,
) -> bool:
    if pending_grading_ids is not None:
        return assignment.id in pending_grading_ids
    return assignment.id in get_pending_grading_assignment_ids([assignment.id])


def assignment_has_started(
    assignment: TaskAssignment,
    *,
    started_submission_ids: Optional[set[int]] = None,
) -> bool:
    for progress in assignment.knowledge_progress.all():
        if progress.started_at or progress.completed_at or progress.is_completed:
            return True
    if started_submission_ids is not None:
        return assignment.id in started_submission_ids
    return Submission.objects.filter(task_assignment_id=assignment.id).exists()


def assignment_execution_status(
    assignment: TaskAssignment,
    *,
    now=None,
    pending_grading_ids: Optional[set[int]] = None,
    started_submission_ids: Optional[set[int]] = None,
) -> str:
    now = now or timezone.now()
    if assignment.status == 'COMPLETED':
        return 'COMPLETED'
    if assignment_has_pending_grading(assignment, pending_grading_ids=pending_grading_ids):
        return 'PENDING_GRADING'
    if assignment.status == 'OVERDUE' or assignment.task.deadline < now:
        return 'OVERDUE'
    if not assignment_has_started(assignment, started_submission_ids=started_submission_ids):
        return 'NOT_STARTED'
    return 'IN_PROGRESS'


def assignment_execution_status_display(status: str) -> str:
    return TASK_EXECUTION_STATUS_LABELS[status]


def _is_exam_duration_abnormal(allow_retry: bool, duration, started_at, submitted_at) -> bool:
    if allow_retry or not duration or not submitted_at or not started_at:
        return False
    duration_minutes = (submitted_at - started_at).total_seconds() / 60
    return duration_minutes < float(duration) * 0.2


def is_exam_submission_abnormal(submission: Submission) -> bool:
    task_quiz = getattr(submission, 'task_quiz', None)
    if task_quiz is None:
        return False
    return _is_exam_duration_abnormal(
        task_quiz.allow_retry,
        task_quiz.duration,
        submission.started_at,
        submission.submitted_at,
    )
