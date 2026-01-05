"""
Knowledge URLs.

API endpoints for knowledge document management.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
from django.urls import path

from .views import (
    KnowledgeListCreateView,
    KnowledgeDetailView,
    KnowledgeStatsView,
    KnowledgeIncrementViewCountView,
    StudentKnowledgeListView,
    TagListView,
    TagCreateView,
    TagDetailView,
)

urlpatterns = [
    # Knowledge endpoints
    path('', KnowledgeListCreateView.as_view(), name='knowledge-list-create'),
    path('student/', StudentKnowledgeListView.as_view(), name='student-knowledge-list'),
    path('stats/', KnowledgeStatsView.as_view(), name='knowledge-stats'),
    path('<int:pk>/', KnowledgeDetailView.as_view(), name='knowledge-detail'),
    path('<int:pk>/view/', KnowledgeIncrementViewCountView.as_view(), name='knowledge-view'),
    
    # Tag management endpoints
    path('tags/', TagListView.as_view(), name='tag-list'),
    path('tags/create/', TagCreateView.as_view(), name='tag-create'),
    path('tags/<int:pk>/', TagDetailView.as_view(), name='tag-detail'),
]
