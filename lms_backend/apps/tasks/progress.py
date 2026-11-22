from __future__ import annotations

from typing import Any, Optional


QUIZ_COMPLETION_STATUSES = ('SUBMITTED', 'GRADED')


def build_assignment_progress(
    assignment,
    *,
    quiz_completed: Optional[int] = None,
    statuses: tuple[str, ...] = QUIZ_COMPLETION_STATUSES,
) -> dict[str, Any]:
    task = assignment.task
    task_knowledge_items = _get_prefetched_related(task, 'task_knowledge')
    task_quiz_items = _get_prefetched_related(task, 'task_quizzes')
    knowledge_progress_items = _get_prefetched_related(assignment, 'knowledge_progress')

    total_knowledge = (
        len(task_knowledge_items)
        if task_knowledge_items is not None
        else task.task_knowledge.count()
    )
    total_quizzes = (
        len(task_quiz_items)
        if task_quiz_items is not None
        else task.task_quizzes.count()
    )
    total = total_knowledge + total_quizzes

    if total == 0:
        return {
            'completed': 0,
            'total': 0,
            'percentage': 0,
            'knowledge_total': 0,
            'knowledge_completed': 0,
            'quiz_total': 0,
            'quiz_completed': 0,
        }

    completed_knowledge = (
        sum(1 for progress in knowledge_progress_items if progress.is_completed)
        if knowledge_progress_items is not None
        else assignment.knowledge_progress.filter(is_completed=True).count()
    )
    if quiz_completed is not None:
        completed_quizzes = quiz_completed
    else:
        completed_quizzes = get_assignment_quiz_progress_map(
            [assignment.id],
            statuses=statuses,
        ).get(assignment.id, 0)
    completed = completed_knowledge + completed_quizzes

    return {
        'completed': completed,
        'total': total,
        'percentage': round(completed / total * 100, 1),
        'knowledge_total': total_knowledge,
        'knowledge_completed': completed_knowledge,
        'quiz_total': total_quizzes,
        'quiz_completed': completed_quizzes,
    }


def is_assignment_completed(progress_data: dict[str, Any]) -> bool:
    total = progress_data['total']
    return total > 0 and progress_data['completed'] >= total


def get_assignment_quiz_progress_map(
    assignment_ids: list[int],
    *,
    statuses: tuple[str, ...] = QUIZ_COMPLETION_STATUSES,
) -> dict[int, int]:
    from apps.submissions.models import Submission

    progress_map = {assignment_id: 0 for assignment_id in assignment_ids}
    if not assignment_ids:
        return progress_map

    grouped_quiz_ids: dict[int, set[int]] = {}
    rows = Submission.objects.filter(
        task_assignment_id__in=assignment_ids,
        status__in=statuses,
    ).values_list('task_assignment_id', 'task_quiz_id').distinct()
    for assignment_id, task_quiz_id in rows:
        grouped_quiz_ids.setdefault(assignment_id, set()).add(task_quiz_id)

    for assignment_id, quiz_ids in grouped_quiz_ids.items():
        progress_map[assignment_id] = len(quiz_ids)

    return progress_map


def _get_prefetched_related(instance, relation_name: str):
    return getattr(instance, '_prefetched_objects_cache', {}).get(relation_name)
