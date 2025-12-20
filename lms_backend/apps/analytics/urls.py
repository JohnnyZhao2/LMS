"""
Analytics URLs.

Implements URL routing for:
- Student dashboard (Requirements: 15.1, 15.2, 15.3)
- Student knowledge center (Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6)
- Student task center (Requirements: 17.1, 17.2, 17.3)
- Student personal center (Requirements: 18.1, 18.2, 18.3, 18.4)
- Mentor/Department manager dashboard (Requirements: 19.1, 19.2, 19.3, 19.4)
- Team manager data board (Requirements: 21.1, 21.2, 21.3)
"""
from django.urls import path

from .views import (
    StudentDashboardView,
    StudentKnowledgeListView,
    StudentKnowledgeDetailView,
    StudentTaskCenterListView,
    StudentTaskCenterDetailView,
    StudentProfileView,
    StudentScoreHistoryView,
    StudentWrongAnswersView,
    StudentScoreExportView,
    MentorDashboardView,
    TeamManagerOverviewView,
    KnowledgeHeatView,
)

urlpatterns = [
    # Student dashboard
    # Requirements: 15.1, 15.2, 15.3
    path('dashboard/student/', StudentDashboardView.as_view(), name='student-dashboard'),
    
    # Mentor/Department manager dashboard
    # Requirements: 19.1, 19.2, 19.3, 19.4
    path('dashboard/mentor/', MentorDashboardView.as_view(), name='mentor-dashboard'),
    
    # Team manager data board
    # Requirements: 21.1, 21.2, 21.3
    path('team-overview/', TeamManagerOverviewView.as_view(), name='team-manager-overview'),
    path('knowledge-heat/', KnowledgeHeatView.as_view(), name='knowledge-heat'),
    
    # Student knowledge center
    # Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
    path('knowledge-center/', StudentKnowledgeListView.as_view(), name='student-knowledge-list'),
    path('knowledge-center/<int:pk>/', StudentKnowledgeDetailView.as_view(), name='student-knowledge-detail'),
    
    # Student task center
    # Requirements: 17.1, 17.2, 17.3
    path('task-center/', StudentTaskCenterListView.as_view(), name='student-task-center-list'),
    path('task-center/<int:assignment_id>/', StudentTaskCenterDetailView.as_view(), name='student-task-center-detail'),
    
    # Student personal center
    # Requirements: 18.1, 18.2, 18.3, 18.4
    path('personal-center/profile/', StudentProfileView.as_view(), name='student-profile'),
    path('personal-center/scores/', StudentScoreHistoryView.as_view(), name='student-score-history'),
    path('personal-center/scores/export/', StudentScoreExportView.as_view(), name='student-score-export'),
    path('personal-center/wrong-answers/', StudentWrongAnswersView.as_view(), name='student-wrong-answers'),
]
