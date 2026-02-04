"""
Dashboard URLs.
Implements URL routing for:
- Student dashboard
- Task participants progress
- Mentor/Department manager dashboard
- Students needing attention
"""
from django.urls import path

from .views import (
    MentorDashboardView,
    StudentDashboardView,
)
from .views.mentor import StudentsNeedingAttentionView
from .views.student import TaskParticipantsView

urlpatterns = [
    # Student dashboard
    path('student/', StudentDashboardView.as_view(), name='student-dashboard'),
    # Task participants progress
    path('student/task/<int:task_id>/participants/', TaskParticipantsView.as_view(), name='task-participants'),
    # Mentor/Department manager dashboard
    path('mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
    # Students needing attention
    path('mentor/students-needing-attention/', StudentsNeedingAttentionView.as_view(), name='students-needing-attention'),
]
