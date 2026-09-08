from typing import List

from django.db.models import QuerySet

from apps.tasks.models import TaskAssignment


def get_assignments_by_students(student_ids: List[int]) -> QuerySet:
    return TaskAssignment.objects.filter(assignee_id__in=student_ids).select_related('task')
