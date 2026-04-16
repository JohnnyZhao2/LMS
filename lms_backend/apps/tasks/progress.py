from __future__ import annotations

from typing import Any, Optional


QUIZ_COMPLETION_STATUSES = ('SUBMITTED', 'GRADING', 'GRADED')


def build_assignment_progress(
    assignment,
    *,
    quiz_completed: Optional[int] = None,
    quiz_progress: Optional[dict[str, int]] = None,
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
            'exam_total': 0,
            'exam_completed': 0,
            'practice_total': 0,
            'practice_completed': 0,
        }

    completed_knowledge = (
        sum(1 for progress in knowledge_progress_items if progress.is_completed)
        if knowledge_progress_items is not None
        else assignment.knowledge_progress.filter(is_completed=True).count()
    )
    completed_quiz_progress = quiz_progress or _get_completed_quiz_progress(assignment)
    completed_quizzes = (
        quiz_completed
        if quiz_completed is not None
        else completed_quiz_progress['completed']
    )
    completed = completed_knowledge + completed_quizzes

    exam_total, practice_total = _count_task_quizzes_by_type(task, task_quiz_items)

    return {
        'completed': completed,
        'total': total,
        'percentage': round(completed / total * 100, 1),
        'knowledge_total': total_knowledge,
        'knowledge_completed': completed_knowledge,
        'quiz_total': total_quizzes,
        'quiz_completed': completed_quizzes,
        'exam_total': exam_total,
        'exam_completed': completed_quiz_progress['exam_completed'],
        'practice_total': practice_total,
        'practice_completed': completed_quiz_progress['practice_completed'],
    }


def is_assignment_completed(progress_data: dict[str, Any]) -> bool:
    total = progress_data['total']
    return total > 0 and progress_data['completed'] >= total


def get_assignment_quiz_progress_map(assignment_ids: list[int]) -> dict[int, dict[str, int]]:
    from apps.submissions.models import Submission

    progress_map = {
        assignment_id: {
            'completed': 0,
            'exam_completed': 0,
            'practice_completed': 0,
        }
        for assignment_id in assignment_ids
    }
    if not assignment_ids:
        return progress_map

    grouped_quiz_ids: dict[int, dict[str, set[int]]] = {}
    rows = Submission.objects.filter(
        task_assignment_id__in=assignment_ids,
        status__in=QUIZ_COMPLETION_STATUSES,
    ).values_list('task_assignment_id', 'task_quiz_id', 'quiz__quiz_type').distinct()
    for assignment_id, task_quiz_id, quiz_type in rows:
        bucket = grouped_quiz_ids.setdefault(
            assignment_id,
            {
                'all': set(),
                'EXAM': set(),
                'PRACTICE': set(),
            },
        )
        bucket['all'].add(task_quiz_id)
        if quiz_type in ('EXAM', 'PRACTICE'):
            bucket[quiz_type].add(task_quiz_id)

    for assignment_id, quiz_ids in grouped_quiz_ids.items():
        progress_map[assignment_id] = {
            'completed': len(quiz_ids['all']),
            'exam_completed': len(quiz_ids['EXAM']),
            'practice_completed': len(quiz_ids['PRACTICE']),
        }

    return progress_map


def _count_task_quizzes_by_type(task, prefetched_task_quizzes) -> tuple[int, int]:
    if prefetched_task_quizzes is not None:
        if any('quiz' not in task_quiz.__dict__ for task_quiz in prefetched_task_quizzes):
            return (
                task.task_quizzes.filter(quiz__quiz_type='EXAM').count(),
                task.task_quizzes.filter(quiz__quiz_type='PRACTICE').count(),
            )
        exam_total = 0
        practice_total = 0
        for task_quiz in prefetched_task_quizzes:
            quiz = task_quiz.__dict__['quiz']
            if quiz.quiz_type == 'EXAM':
                exam_total += 1
            elif quiz.quiz_type == 'PRACTICE':
                practice_total += 1
        return exam_total, practice_total

    return (
        task.task_quizzes.filter(quiz__quiz_type='EXAM').count(),
        task.task_quizzes.filter(quiz__quiz_type='PRACTICE').count(),
    )


def _get_prefetched_related(instance, relation_name: str):
    return getattr(instance, '_prefetched_objects_cache', {}).get(relation_name)


def _get_completed_quiz_progress(assignment) -> dict[str, int]:
    return get_assignment_quiz_progress_map([assignment.id]).get(
        assignment.id,
        {
            'completed': 0,
            'exam_completed': 0,
            'practice_completed': 0,
        },
    )
