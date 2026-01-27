"""
Knowledge URLs.
API endpoints for knowledge document management.
"""
from django.urls import path

from .views import (
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    KnowledgeStatsView,
    StudentTaskKnowledgeDetailView,
    TagCreateView,
    TagListView,
)

urlpatterns = [
    # Knowledge endpoints
    path('', KnowledgeListCreateView.as_view(), name='knowledge-list-create'),
    path('task/<int:task_knowledge_id>/', StudentTaskKnowledgeDetailView.as_view(), name='student-task-knowledge-detail'),
    path('stats/', KnowledgeStatsView.as_view(), name='knowledge-stats'),
    path('<int:pk>/', KnowledgeDetailView.as_view(), name='knowledge-detail'),
    path('<int:pk>/view/', KnowledgeIncrementViewCountView.as_view(), name='knowledge-view'),
    # Tag management endpoints
    path('tags/', TagListView.as_view(), name='tag-list'),
    path('tags/create/', TagCreateView.as_view(), name='tag-create'),
]
