"""
Task views module.

Split into:
- admin.py: Task management views for admin/mentor/dept_manager
- student.py: Student task execution views
"""
from .admin import (
    AssignableUserListView,
    TaskCreateView,
    TaskListView,
    TaskDetailView,
    TaskCloseView,
)
from .student import (
    StudentAssignmentListView,
    StudentTaskDetailView,
    CompleteKnowledgeLearningView,
)

__all__ = [
    # Admin views
    'AssignableUserListView',
    'TaskCreateView',
    'TaskListView',
    'TaskDetailView',
    'TaskCloseView',
    # Student views
    'StudentAssignmentListView',
    'StudentTaskDetailView',
    'CompleteKnowledgeLearningView',
]
