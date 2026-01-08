"""
Dashboard URLs.
Implements URL routing for:
- Student dashboard
- Mentor/Department manager dashboard
"""
from django.urls import path
from .views import (
    StudentDashboardView,
    MentorDashboardView,
)
urlpatterns = [
    # Student dashboard
    path('student/', StudentDashboardView.as_view(), name='student-dashboard'),
    # Mentor/Department manager dashboard
    path('mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
]
