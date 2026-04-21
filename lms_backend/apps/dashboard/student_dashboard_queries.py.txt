from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.db.models import Avg, Prefetch, QuerySet
from django.utils import timezone

from apps.submissions.models import Submission
from apps.tasks.models import TaskAssignment, TaskQuiz
from apps.tasks.progress import build_assignment_progress, get_assignment_quiz_progress_map


def get_student_assignments(user_id: int) -> QuerySet:
    return TaskAssignment.objects.filter(assignee_id=user_id)


def get_student_all_tasks(user_id: int, limit: int = 10) -> QuerySet:
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
    ).select_related(
        'task', 'task__created_by'
    ).prefetch_related(
        'task__task_knowledge',
        'task__task_quizzes',
        'knowledge_progress',
    ).order_by('-task__deadline')[:limit]


def get_urgent_tasks_count(user_id: int, hours: int = 48) -> int:
    deadline_threshold = timezone.now() + timedelta(hours=hours)
    return TaskAssignment.objects.filter(
        assignee_id=user_id,
        status='IN_PROGRESS',
        task__deadline__lte=deadline_threshold,
        task__deadline__gt=timezone.now(),
    ).count()


def get_student_exam_avg_score(user_id: int) -> Optional[float]:
    result = Submission.objects.filter(
        user_id=user_id,
        status='GRADED',
        quiz__quiz_type='EXAM',
    ).aggregate(avg_score=Avg('obtained_score'))
    return float(result['avg_score']) if result['avg_score'] is not None else None


def calculate_assignment_progress(
    assignment: 'TaskAssignment',
    quiz_completed: Optional[int] = None,
) -> Dict[str, Any]:
    quiz_progress = get_assignment_quiz_progress_map([assignment.id]).get(assignment.id)
    return build_assignment_progress(
        assignment,
        quiz_completed=quiz_completed,
        quiz_progress=quiz_progress,
    )


def get_task_participants_progress(
    task_id: int,
    current_user_id: int,
    limit: int = 5,
) -> List[Dict[str, Any]]:
    assignments = TaskAssignment.objects.filter(task_id=task_id).select_related(
        'assignee', 'task'
    ).prefetch_related(
        'task__task_knowledge',
        Prefetch('task__task_quizzes', queryset=TaskQuiz.objects.select_related('quiz')),
        'knowledge_progress',
    )
    quiz_progress_map = get_assignment_quiz_progress_map([assignment.id for assignment in assignments])

    participants = []
    for assignment in assignments:
        progress_data = build_assignment_progress(
            assignment,
            quiz_progress=quiz_progress_map.get(assignment.id),
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

    my_index = next((index for index, item in enumerate(participants) if item['is_me']), 0)
    start = max(0, my_index - 2)
    end = min(len(participants), start + limit)
    if end - start < limit:
        start = max(0, end - limit)

    return participants[start:end]
