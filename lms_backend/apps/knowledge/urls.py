"""
Knowledge URLs.
API endpoints for knowledge document management.
"""
from django.urls import path

from .views import (
    KnowledgeBulkDeleteView,
    KnowledgeBulkImportView,
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    StudentTaskKnowledgeDetailView,
)

urlpatterns = [
    path('', KnowledgeListCreateView.as_view(), name='knowledge-list-create'),
    path('import/', KnowledgeBulkImportView.as_view(), name='knowledge-bulk-import'),
    path('bulk-delete/', KnowledgeBulkDeleteView.as_view(), name='knowledge-bulk-delete'),
    path('task/<int:task_knowledge_id>/', StudentTaskKnowledgeDetailView.as_view(), name='student-task-knowledge-detail'),
    path('<int:pk>/', KnowledgeDetailView.as_view(), name='knowledge-detail'),
    path('<int:pk>/view/', KnowledgeIncrementViewCountView.as_view(), name='knowledge-view'),
]
