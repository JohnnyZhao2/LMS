"""
Dashboard views module.
Split into:
- student.py: Student dashboard views
- mentor.py: Mentor/Department manager dashboard views
- team_manager.py: Team manager dashboard views
"""
from .mentor import (
    MentorDashboardView,
)
from .student import (
    StudentDashboardView,
)
from .team_manager import (
    TeamManagerDashboardView,
)

__all__ = [
    # Student views
    'StudentDashboardView',
    # Mentor views
    'MentorDashboardView',
    # Team manager views
    'TeamManagerDashboardView',
]
