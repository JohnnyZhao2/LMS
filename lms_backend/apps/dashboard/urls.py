"""
Dashboard URLs.
Implements URL routing for:
- Student dashboard
- Task participants progress
- Mentor/Department manager dashboard
- Team manager dashboard
"""
from django.urls import path

from .views import (
    MentorDashboardView,
    StudentDashboardView,
    TeamManagerDashboardView,
)
from .views.student import TaskParticipantsView

urlpatterns = [
    # Student dashboard
    path('student/', StudentDashboardView.as_view(), name='student-dashboard'),
    # Task participants progress
    path('student/task/<int:task_id>/participants/', TaskParticipantsView.as_view(), name='task-participants'),
    # Mentor/Department manager dashboard
    path('mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
    # Team manager dashboard
    path('team-manager/', TeamManagerDashboardView.as_view(), name='team-manager-dashboard'),
]
