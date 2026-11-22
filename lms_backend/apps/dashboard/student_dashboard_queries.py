from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Prefetch, QuerySet
from django.utils import timezone

from apps.submissions.models import Submission
from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.tasks.progress import build_assignment_progress, get_assignment_quiz_progress_map
from apps.tasks.selectors import get_pending_grading_assignment_ids


def get_student_assignments(user_id: int) -> QuerySet:
    return TaskAssignment.objects.filter(assignee_id=user_id, task__is_archived=False)


def get_student_all_tasks(user_id: int, limit: int = 10) -> QuerySet:
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
        task__is_archived=False,
    ).select_related(
        'task', 'task__created_by'
    ).prefetch_related(
        'task__task_knowledge',
        'task__task_quizzes',
        'knowledge_progress',
    ).order_by('-task__deadline')[:limit]


def get_urgent_tasks_count(user_id: int, hours: int = 48) -> int:
    now = timezone.now()
    deadline_threshold = now + timedelta(hours=hours)
    candidate_ids = list(
        TaskAssignment.objects.filter(
            assignee_id=user_id,
            task__is_archived=False,
            status='IN_PROGRESS',
            task__deadline__lte=deadline_threshold,
            task__deadline__gt=now,
        ).values_list('id', flat=True)
    )
    if not candidate_ids:
        return 0
    pending_grading_ids = get_pending_grading_assignment_ids(candidate_ids)
    return len(candidate_ids) - len(pending_grading_ids)


def get_task_participants_progress(
    task_id: int,
    current_user_id: int,
) -> List[Dict[str, Any]]:
    assignments = list(
        TaskAssignment.objects.filter(
            task_id=task_id,
            task__is_archived=False,
        ).select_related(
            'assignee', 'task'
        ).prefetch_related(
            'task__task_knowledge',
            Prefetch('task__task_quizzes', queryset=TaskQuiz.objects.all()),
            'knowledge_progress',
        )
    )
    if not any(assignment.assignee_id == current_user_id for assignment in assignments):
        return []
    quiz_progress_map = get_assignment_quiz_progress_map([assignment.id for assignment in assignments])

    participants = []
    for assignment in assignments:
        progress_data = build_assignment_progress(
            assignment,
            quiz_completed=quiz_progress_map.get(assignment.id, 0),
        )
        participants.append({
            'id': assignment.assignee.id,
            'name': assignment.assignee.username,
            'progress': progress_data['percentage'],
            'is_me': assignment.assignee.id == current_user_id,
        })

    participants.sort(key=lambda x: x['progress'], reverse=True)
    for index, participant in enumerate(participants):
        participant['rank'] = index + 1

    return participants
