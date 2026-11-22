"""Student task execution service."""

from typing import List, Optional

from apps.activity_logs.decorators import log_operation
from django.db import transaction
from django.db.models import Exists, OuterRef, Q, QuerySet
from django.utils import timezone
from django.utils.html import strip_tags

from apps.submissions.models import Submission
from apps.submissions.scoring import submission_recency_key
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .assignment_workflow import sync_assignment_completion_status, sync_assignment_overdue_status
from .models import KnowledgeLearningProgress, TaskAssignment
from .progress import QUIZ_COMPLETION_STATUSES
from .selectors import (
    ANALYTICS_SUBMISSION_STATUSES,
    TASK_EXECUTION_STATUS_LABELS,
    assignment_detail_queryset,
    assignment_list_queryset,
    get_pending_grading_assignment_ids,
    knowledge_progress_queryset,
    task_knowledge_queryset,
    task_quiz_queryset,
)

STUDENT_TASK_LIST_STATUSES = set(TASK_EXECUTION_STATUS_LABELS)


def extract_knowledge_preview(knowledge, max_length: int = 160) -> str:
    """任务侧纯文本预览。"""
    text = ' '.join(strip_tags(getattr(knowledge, 'content', '') or '').split())
    return f'{text[:max_length]}...' if len(text) > max_length else text


class StudentTaskService(BaseService):
    def get_student_assignment(self, task_id: int) -> TaskAssignment:
        assignment = assignment_detail_queryset().filter(
            task_id=task_id,
            assignee_id=self.user.id,
            task__is_archived=False,
        ).first()
        self.validate_not_none(assignment, '任务不存在或未分配给您')
        sync_assignment_overdue_status(assignment)
        return assignment

    @transaction.atomic
    @log_operation(
        'learning',
        'complete_knowledge',
        '任务：{assignment.task.title}',
        target_type='knowledge',
        target_title_template='{result.task_knowledge.knowledge.title}',
        group='学习进度',
        label='完成学习',
    )
    def complete_knowledge_learning(
        self,
        assignment: TaskAssignment,
        task_knowledge_id: int,
    ) -> KnowledgeLearningProgress:
        assignment = TaskAssignment.objects.select_for_update(of=('self',)).select_related('task').get(pk=assignment.id)
        sync_assignment_overdue_status(assignment)
        if assignment.status == 'COMPLETED':
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='任务已完成')
        if assignment.status == 'OVERDUE':
            raise BusinessError(code=ErrorCodes.INVALID_OPERATION, message='任务已逾期，无法继续学习')
        task_knowledge = task_knowledge_queryset(assignment.task.id).filter(id=task_knowledge_id).first()
        if not task_knowledge:
            raise BusinessError(code=ErrorCodes.RESOURCE_NOT_FOUND, message='该任务知识不在此任务中')
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
        progress.refresh_from_db()
        return progress

    @staticmethod
    def build_student_assignment_detail_context(assignment: TaskAssignment) -> dict:
        submissions = list(
            Submission.objects.filter(task_assignment_id=assignment.id).only(
                'id',
                'task_assignment_id',
                'task_quiz_id',
                'status',
                'attempt_number',
                'obtained_score',
                'submitted_at',
                'created_at',
            )
        )
        latest_by_quiz: dict[int, tuple[tuple, str]] = {}
        completed_quiz_ids: set[int] = set()
        for sub in submissions:
            if sub.status in QUIZ_COMPLETION_STATUSES:
                completed_quiz_ids.add(sub.task_quiz_id)
            rank = submission_recency_key(sub.status, sub.attempt_number, sub.submitted_at, sub.id)
            prev = latest_by_quiz.get(sub.task_quiz_id)
            if prev is None or rank > prev[0]:
                latest_by_quiz[sub.task_quiz_id] = (rank, sub.status)

        grading_quiz_ids = {
            quiz_id
            for quiz_id, (_, status) in latest_by_quiz.items()
            if status == 'GRADING'
        }
        has_pending_grading = False
        if grading_quiz_ids:
            prefetched_tk = getattr(assignment.task, '_prefetched_objects_cache', {}).get('task_knowledge')
            total_knowledge_count = (
                len(prefetched_tk)
                if prefetched_tk is not None
                else task_knowledge_queryset(assignment.task.id).count()
            )
            prefetched_kp = getattr(assignment, '_prefetched_objects_cache', {}).get('knowledge_progress')
            completed_knowledge_count = (
                sum(1 for p in prefetched_kp if p.is_completed)
                if prefetched_kp is not None
                else knowledge_progress_queryset(assignment.id).filter(is_completed=True).count()
            )
            prefetched_tq = getattr(assignment.task, '_prefetched_objects_cache', {}).get('task_quizzes')
            total_quiz_count = (
                len(prefetched_tq)
                if prefetched_tq is not None
                else task_quiz_queryset(assignment.task.id).count()
            )
            covered_quizzes = completed_quiz_ids | grading_quiz_ids
            has_pending_grading = (
                completed_knowledge_count >= total_knowledge_count
                and len(covered_quizzes) >= total_quiz_count
            )
        return {
            'submissions': submissions,
            'quiz_progress_map': {assignment.id: len(completed_quiz_ids)},
            'pending_grading_ids': {assignment.id} if has_pending_grading else set(),
            'started_submission_ids': {assignment.id} if submissions else set(),
        }

    @staticmethod
    def get_student_knowledge_items(assignment: TaskAssignment) -> List[dict]:
        prefetched_tk = getattr(assignment.task, '_prefetched_objects_cache', {}).get('task_knowledge')
        task_knowledge_items = (
            prefetched_tk if prefetched_tk is not None else task_knowledge_queryset(assignment.task.id)
        )
        prefetched_kp = getattr(assignment, '_prefetched_objects_cache', {}).get('knowledge_progress')
        progress_rows = (
            prefetched_kp if prefetched_kp is not None else knowledge_progress_queryset(assignment.id)
        )
        progress_map = {p.task_knowledge_id: p for p in progress_rows}
        result = []
        for tk in task_knowledge_items:
            progress = progress_map.get(tk.id)
            knowledge = tk.knowledge
            result.append(
                {
                    'id': tk.id,
                    'knowledge_id': tk.source_knowledge_id,
                    'knowledge_revision_id': tk.knowledge_id,
                    'title': knowledge.title,
                    'space_tag_name': knowledge.space_tag_name or None,
                    'content_preview': extract_knowledge_preview(knowledge),
                    'order': tk.order,
                    'is_completed': progress.is_completed if progress else False,
                    'completed_at': progress.completed_at if progress else None,
                }
            )
        return result

    @staticmethod
    def get_student_quiz_items(
        assignment: TaskAssignment,
        submissions: Optional[List[Submission]] = None,
    ) -> List[dict]:
        prefetched_tq = getattr(assignment.task, '_prefetched_objects_cache', {}).get('task_quizzes')
        if prefetched_tq is not None and all(
            hasattr(item, 'question_count_value') and hasattr(item, 'total_score_value')
            for item in prefetched_tq
        ):
            task_quiz_items = prefetched_tq
        else:
            task_quiz_items = task_quiz_queryset(assignment.task.id)

        if submissions is None:
            submitted_rows = Submission.objects.filter(
                task_assignment_id=assignment.id,
                status__in=ANALYTICS_SUBMISSION_STATUSES,
            )
        else:
            submitted_rows = [
                sub for sub in submissions if sub.status in ANALYTICS_SUBMISSION_STATUSES
            ]
        submission_map = {}
        for submission in submitted_rows:
            submission_map.setdefault(submission.task_quiz_id, []).append(submission)

        result = []
        for tq in task_quiz_items:
            quiz_subs = submission_map.get(tq.id, [])
            finalized_subs = [s for s in quiz_subs if s.status in ('SUBMITTED', 'GRADED')]
            is_completed = len(finalized_subs) > 0
            best_sub = (
                max(finalized_subs, key=lambda x: x.obtained_score or 0)
                if finalized_subs
                else None
            )
            latest_sub = (
                max(
                    quiz_subs,
                    key=lambda x: submission_recency_key(x.status, x.attempt_number, x.submitted_at, x.id),
                )
                if quiz_subs
                else None
            )
            result.append(
                {
                    'id': tq.id,
                    'quiz_title': tq.title,
                    'allow_retry': tq.allow_retry,
                    'kind_label': tq.kind_label,
                    'question_count': tq.question_count,
                    'total_score': float(tq.total_score) if tq.total_score else 0,
                    'duration': tq.duration,
                    'pass_score': float(tq.pass_score) if tq.pass_score is not None else None,
                    'order': tq.order,
                    'is_completed': is_completed,
                    'score': float(best_sub.obtained_score) if best_sub and best_sub.obtained_score is not None else None,
                    'latest_submission_id': latest_sub.id if latest_sub else None,
                    'latest_status': latest_sub.status if latest_sub else None,
                }
            )
        return result

    def get_student_assignments_queryset(
        self,
        status_filter: str = None,
        search: str = None,
    ) -> QuerySet:
        qs = assignment_list_queryset().filter(
            assignee_id=self.user.id,
            task__is_archived=False,
        )
        if search:
            qs = qs.filter(task__title__icontains=search)
        if status_filter:
            if status_filter not in STUDENT_TASK_LIST_STATUSES:
                raise BusinessError(code=ErrorCodes.VALIDATION_ERROR, message='任务状态无效')
            qs = self._filter_by_execution_status(qs, status_filter)
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
        return qs.annotate(
            has_started_knowledge=Exists(started_knowledge),
            has_submission=Exists(submissions),
        )

    def _filter_by_execution_status(self, qs: QuerySet, status_filter: str) -> QuerySet:
        now = timezone.now()
        if status_filter == 'COMPLETED':
            return qs.filter(status='COMPLETED')

        non_completed_qs = qs.exclude(status='COMPLETED')
        grading_ids = get_pending_grading_assignment_ids(
            non_completed_qs.values_list('id', flat=True)
        )
        if status_filter == 'OVERDUE':
            return qs.filter(
                Q(status='OVERDUE') | Q(status='IN_PROGRESS', task__deadline__lt=now)
            ).exclude(id__in=grading_ids)
        if status_filter == 'PENDING_GRADING':
            return non_completed_qs.filter(id__in=grading_ids)

        active_qs = self._with_execution_status_flags(
            qs.filter(status='IN_PROGRESS', task__deadline__gte=now).exclude(id__in=grading_ids)
        )
        if status_filter == 'NOT_STARTED':
            return active_qs.filter(
                has_started_knowledge=False,
                has_submission=False,
            )
        return active_qs.filter(
            Q(has_started_knowledge=True) | Q(has_submission=True)
        )
