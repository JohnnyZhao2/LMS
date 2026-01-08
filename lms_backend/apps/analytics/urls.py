"""
Analytics URLs.
Implements URL routing for:
- Student dashboard
- Student task center
- Mentor/Department manager dashboard
Note: Student knowledge center APIs moved to knowledge module (/api/knowledge/student/)
"""
from django.urls import path
from .views import (
    StudentDashboardView,
    MentorDashboardView,
)
urlpatterns = [
    # Student dashboard
    path('dashboard/student/', StudentDashboardView.as_view(), name='student-dashboard'),
    # Mentor/Department manager dashboard
    path('dashboard/mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
]
