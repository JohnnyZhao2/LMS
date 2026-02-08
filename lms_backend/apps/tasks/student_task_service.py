"""
Student task execution service.
Provides business logic for:
- Student task list and detail retrieval
- Knowledge learning progress tracking
- Task completion logic
"""
from typing import List

from django.db.models import QuerySet
from django.utils import timezone

from apps.submissions.models import Submission
from core.base_service import BaseService
from core.decorators import log_operation
from core.exceptions import BusinessError, ErrorCodes

from .models import KnowledgeLearningProgress, TaskAssignment
from .selectors import (
    assignment_detail_queryset,
    assignment_list_queryset,
    knowledge_progress_queryset,
    task_knowledge_queryset,
    task_quiz_queryset,
)


def extract_knowledge_summary(knowledge, max_length: int = 160) -> str:
    """Extract a summary from knowledge content."""
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


class StudentTaskService(BaseService):
    """
    Service for student task execution operations.
    Handles:
    - Student task list and detail retrieval
    - Knowledge learning progress tracking
    - Task completion logic
    """

    def get_student_assignment(self, task_id: int) -> TaskAssignment:
        """
        Get a student's task assignment.
        """
        assignment = assignment_detail_queryset().filter(
            task_id=task_id,
            assignee_id=self.user.id,
            task__is_deleted=False
        ).first()
        self.validate_not_none(assignment, '任务不存在或未分配给您')
        self._check_and_update_overdue(assignment)
        return assignment

    def _check_and_update_overdue(self, assignment: TaskAssignment) -> None:
        """检查并更新任务分配的逾期状态"""
        if assignment.status == 'COMPLETED':
            return
        current_time = timezone.now()
        task_deadline = assignment.task.deadline
        if current_time > task_deadline and assignment.status != 'OVERDUE':
            assignment.status = 'OVERDUE'
            assignment.save(update_fields=['status'])

    def ensure_knowledge_progress(self, assignment: TaskAssignment) -> None:
        """Ensure KnowledgeLearningProgress records exist for all task knowledge items."""
        task_knowledge_items = task_knowledge_queryset(assignment.task.id)
        existing_progress = set(
            KnowledgeLearningProgress.objects.filter(
                assignment_id=assignment.id
            ).values_list('task_knowledge_id', flat=True)
        )
        for tk in task_knowledge_items:
            if tk.id not in existing_progress:
                KnowledgeLearningProgress.objects.create(
                    assignment_id=assignment.id,
                    task_knowledge_id=tk.id,
                    is_completed=False
                )

    @log_operation('learning', 'complete_knowledge', '完成学习：{result.task_knowledge.knowledge.title}')
    def complete_knowledge_learning(
        self,
        assignment: TaskAssignment,
        knowledge_id: int
    ) -> KnowledgeLearningProgress:
        """
        Mark a knowledge document as completed.
        """
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
        task_knowledge_items = task_knowledge_queryset(assignment.task.id)
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
        progress, _ = KnowledgeLearningProgress.objects.get_or_create(
            assignment_id=assignment.id,
            task_knowledge_id=task_knowledge.id,
            defaults={'is_completed': False}
        )
        if progress.is_completed:
            raise BusinessError(
                code=ErrorCodes.INVALID_OPERATION,
                message='该知识已标记为已学习'
            )
        progress.is_completed = True
        progress.completed_at = timezone.now()
        progress.save(update_fields=['is_completed', 'completed_at'])
        progress.refresh_from_db()
        return progress

    @staticmethod
    def get_student_knowledge_items(assignment: TaskAssignment) -> List[dict]:
        """获取学员任务的知识条目与进度"""
        task_knowledge_items = task_knowledge_queryset(assignment.task.id)
        progress_map = {
            p.task_knowledge_id: p
            for p in knowledge_progress_queryset(assignment.id)
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

    @staticmethod
    def get_student_quiz_items(assignment: TaskAssignment) -> List[dict]:
        """获取学员任务的试卷条目与提交状态"""
        task_quiz_items = task_quiz_queryset(assignment.task.id)
        submissions = Submission.objects.filter(
            task_assignment_id=assignment.id,
            status__in=['SUBMITTED', 'GRADING', 'GRADED']
        ).select_related('quiz')
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
        status_filter: str = None,
        search: str = None
    ) -> QuerySet:
        """Get student's task assignments queryset with filters."""
        qs = assignment_list_queryset().filter(
            assignee_id=self.user.id,
            task__is_deleted=False
        )
        if status_filter:
            qs = qs.filter(status=status_filter)
        if search:
            qs = qs.filter(task__title__icontains=search)
        return qs.order_by('-task__deadline')
