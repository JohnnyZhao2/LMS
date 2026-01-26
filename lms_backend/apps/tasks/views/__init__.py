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
    TaskListView,
    TaskDetailView,
    TaskCloseView,
)
from .student import (
    StudentAssignmentListView,
    StudentTaskDetailView,
    CompleteKnowledgeLearningView,
)
from .analytics import (
    TaskAnalyticsView,
    StudentExecutionsView,
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
    # Analytics views
    'TaskAnalyticsView',
    'StudentExecutionsView',
]
