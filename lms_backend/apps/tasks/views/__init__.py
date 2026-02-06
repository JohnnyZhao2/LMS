"""
Task views module.
Split into:
- admin.py: Task management views for admin/mentor/dept_manager
- student.py: Student task execution views
- analytics.py: Task analytics views
"""
from .admin import (
    AssignableUserListView,
    TaskCreateView,
    TaskDetailView,
    TaskListView,
)
from .analytics import (
    StudentExecutionsView,
    TaskAnalyticsView,
)
from .student import (
    CompleteKnowledgeLearningView,
    StudentAssignmentListView,
    StudentTaskDetailView,
)

__all__ = [
    # Admin views
    'AssignableUserListView',
    'TaskCreateView',
    'TaskListView',
    'TaskDetailView',
    # Student views
    'StudentAssignmentListView',
    'StudentTaskDetailView',
    'CompleteKnowledgeLearningView',
    # Analytics views
    'TaskAnalyticsView',
    'StudentExecutionsView',
]
