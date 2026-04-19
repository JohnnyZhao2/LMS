from typing import Dict, List

from django.db.models import Case, Count, IntegerField, Sum, Value, When

from apps.tasks.models import TaskAssignment


def calculate_average_completion_rate_by_students(student_ids: List[int]) -> float:
    if not student_ids:
        return 0.0

    per_student_stats = TaskAssignment.objects.filter(assignee_id__in=student_ids).values('assignee_id').annotate(
        total=Count('id'),
        completed=Sum(
            Case(
                When(status='COMPLETED', then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ),
    )
    stats_map: Dict[int, Dict[str, int]] = {
        row['assignee_id']: {
            'total': row['total'],
            'completed': row['completed'],
        }
        for row in per_student_stats
    }

    total_rate = 0.0
    for student_id in student_ids:
        stat = stats_map.get(student_id)
        if not stat or stat['total'] == 0:
            continue
        total_rate += stat['completed'] / stat['total'] * 100

    return round(total_rate / len(student_ids), 1)
