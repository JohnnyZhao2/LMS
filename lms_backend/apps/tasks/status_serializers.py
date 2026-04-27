"""Serializer helpers for task execution status fields."""

from .selectors import assignment_execution_status, assignment_execution_status_display


class AssignmentExecutionStatusSerializerMixin:
    def _get_assignment_execution_status(self, obj):
        status_data = getattr(obj, '_execution_status_serializer_cache', None)
        if status_data is None:
            status = assignment_execution_status(obj)
            status_data = (status, assignment_execution_status_display(status))
            setattr(obj, '_execution_status_serializer_cache', status_data)
        return status_data

    def get_status(self, obj):
        return self._get_assignment_execution_status(obj)[0]

    def get_status_display(self, obj):
        return self._get_assignment_execution_status(obj)[1]
