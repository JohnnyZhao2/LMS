"""
Dashboard views module.
Split into:
- student.py: Student dashboard views
- mentor.py: Mentor/Department manager dashboard views
"""
from .mentor import (
    MentorDashboardView,
)
from .student import (
    StudentDashboardView,
)

__all__ = [
    # Student views
    'StudentDashboardView',
    # Mentor views
    'MentorDashboardView',
]
