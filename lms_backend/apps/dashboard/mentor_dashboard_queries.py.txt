from typing import Any, Dict, List

from django.db.models import Avg, Case, Count, IntegerField, QuerySet, Sum, Value, When

from apps.submissions.models import Submission
from apps.tasks.models import TaskAssignment


def get_assignments_by_students(student_ids: List[int]) -> QuerySet:
    return TaskAssignment.objects.filter(assignee_id__in=student_ids).select_related('task')


def get_student_dashboard_metrics(student_ids: List[int]) -> Dict[int, Dict[str, Any]]:
    if not student_ids:
        return {}

    metrics_map: Dict[int, Dict[str, Any]] = {
        student_id: {
            'total_tasks': 0,
            'completed_tasks': 0,
            'in_progress_tasks': 0,
            'overdue_tasks': 0,
            'completion_rate': 0.0,
            'avg_score': None,
        }
        for student_id in student_ids
    }

    assignment_rows = TaskAssignment.objects.filter(assignee_id__in=student_ids).values('assignee_id').annotate(
        total_tasks=Count('id'),
        completed_tasks=Sum(
            Case(
                When(status='COMPLETED', then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ),
        in_progress_tasks=Sum(
            Case(
                When(status='IN_PROGRESS', then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ),
        overdue_tasks=Sum(
            Case(
                When(status='OVERDUE', then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ),
    )

    for row in assignment_rows:
        total_tasks = row['total_tasks'] or 0
        completed_tasks = row['completed_tasks'] or 0
        metrics_map[row['assignee_id']].update({
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': row['in_progress_tasks'] or 0,
            'overdue_tasks': row['overdue_tasks'] or 0,
            'completion_rate': round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0,
        })

    score_rows = Submission.objects.filter(
        user_id__in=student_ids,
        status='GRADED',
    ).values('user_id').annotate(avg_score=Avg('obtained_score'))

    for row in score_rows:
        avg_score = float(row['avg_score']) if row['avg_score'] is not None else None
        metrics_map[row['user_id']]['avg_score'] = avg_score

    return metrics_map
