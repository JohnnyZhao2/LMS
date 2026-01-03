"""
Analytics views module.

Split into:
- student.py: Student dashboard and personal center views
- mentor.py: Mentor/Department manager dashboard views
- team_manager.py: Team manager data board views
"""
from .student import (
    StudentDashboardView,
    StudentProfileView,
    StudentScoreHistoryView,
    StudentWrongAnswersView,
    StudentScoreExportView,
)
from .mentor import (
    MentorDashboardView,
)
from .team_manager import (
    TeamManagerOverviewView,
    KnowledgeHeatView,
)

__all__ = [
    # Student views
    'StudentDashboardView',
    'StudentProfileView',
    'StudentScoreHistoryView',
    'StudentWrongAnswersView',
    'StudentScoreExportView',
    # Mentor views
    'MentorDashboardView',
    # Team manager views
    'TeamManagerOverviewView',
    'KnowledgeHeatView',
]
