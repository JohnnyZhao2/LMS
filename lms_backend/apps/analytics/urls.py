"""
Analytics URLs.

Implements URL routing for:
- Student dashboard (Requirements: 15.1, 15.2, 15.3)
- Student task center (Requirements: 17.1, 17.2, 17.3)
- Mentor/Department manager dashboard (Requirements: 19.1, 19.2, 19.4)

Note: Student knowledge center APIs moved to knowledge module (/api/knowledge/student/)
"""
from django.urls import path

from .views import (
    StudentDashboardView,
    MentorDashboardView,
)

urlpatterns = [
    # Student dashboard
    # Requirements: 15.1, 15.2, 15.3
    path('dashboard/student/', StudentDashboardView.as_view(), name='student-dashboard'),
    
    # Mentor/Department manager dashboard
    # Requirements: 19.1, 19.2, 19.4
    path('dashboard/mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
    
]
