"""
Dashboard views module.
Split into:
- student.py: Student dashboard views
- mentor.py: Mentor/Department manager dashboard views
"""
from .student import (
    StudentDashboardView,
)
from .mentor import (
    MentorDashboardView,
)
__all__ = [
    # Student views
    'StudentDashboardView',
    # Mentor views
    'MentorDashboardView',
]
