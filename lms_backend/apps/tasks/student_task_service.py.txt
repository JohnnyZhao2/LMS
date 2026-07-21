"""Student task execution service."""

from typing import List

from apps.activity_logs.decorators import log_operation
from django.db.models import Exists, OuterRef, Q, QuerySet
from django.utils import timezone

from apps.submissions.models import Submission
from core.base_service import BaseService
from core.exceptions import BusinessError, ErrorCodes

from .assignment_workflow import sync_assignment_completion_status, sync_assignment_overdue_status
from .models import KnowledgeLearningProgress, TaskAssignment
from .selectors import (
    TASK_EXECUTION_STATUS_LABELS,
    assignment_detail_queryset,
    assignment_list_queryset,
    knowledge_progress_queryset,
    task_knowledge_queryset,
    task_quiz_queryset,
)

STUDENT_TASK_LIST_STATUSES = set(TASK_EXECUTION_STATUS_LABELS) - {'COMPLETED_ABNORMAL'}


def extract_knowledge_preview(knowledge, max_length: int = 160) -> str:
    text = getattr(knowledge, 'content_preview', '') or ''
    return text[:max_length] if text else ''


class StudentTaskService(BaseService):
    def get_student_assignment(self, task_id: int) -> TaskAssignment:
        assignment = assignment_detail_queryset().filter(
            task_id=task_id,
            assignee_id=self.user.id,
        ).first()
        self.validate_not_none(assignment, '任务不存在或未分配给您')
        sync_assignment_overdue_status(assignment)
        return assignment

    @log_operation(
        'learning',
        'complete_knowledge',
        '任务：{task_title}',
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
    def get_student_knowledge_items(assignment: TaskAssignment) -> List[dict]:
        task_knowledge_items = task_knowledge_queryset(assignment.task.id)
        progress_map = {p.task_knowledge_id: p for p in knowledge_progress_queryset(assignment.id)}
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
        return sorted(result, key=lambda x: x['order'])

    @staticmethod
    def get_student_quiz_items(assignment: TaskAssignment) -> List[dict]:
        task_quiz_items = task_quiz_queryset(assignment.task.id)
        submissions = Submission.objects.filter(
            task_assignment_id=assignment.id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED'],
        ).select_related('quiz')
        submission_map = {}
        for submission in submissions:
            submission_map.setdefault(submission.task_quiz_id, []).append(submission)

        result = []
        for tq in task_quiz_items:
            quiz = tq.quiz
            quiz_subs = submission_map.get(tq.id, [])
            is_completed = len(quiz_subs) > 0
            best_sub = max(quiz_subs, key=lambda x: x.obtained_score or 0) if is_completed else None
            latest_sub = max(quiz_subs, key=lambda x: x.submitted_at) if is_completed else None
            result.append(
                {
                    'id': tq.id,
                    'quiz': tq.id,
                    'quiz_id': tq.id,
                    'task_quiz_id': tq.id,
                    'quiz_revision_id': tq.quiz_id,
                    'quiz_title': quiz.title,
                    'quiz_type': quiz.quiz_type,
                    'quiz_type_display': quiz.get_quiz_type_display(),
                    'question_count': quiz.question_count,
                    'total_score': float(quiz.total_score) if quiz.total_score else 0,
                    'duration': quiz.duration,
                    'pass_score': float(quiz.pass_score) if quiz.pass_score else None,
                    'order': tq.order,
                    'is_completed': is_completed,
                    'score': float(best_sub.obtained_score) if best_sub and best_sub.obtained_score is not None else None,
                    'latest_submission_id': latest_sub.id if latest_sub else None,
                    'latest_status': latest_sub.status if latest_sub else None,
                }
            )
        return sorted(result, key=lambda x: x['order'])

    def get_student_assignments_queryset(
        self,
        status_filter: str = None,
        search: str = None,
    ) -> QuerySet:
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
