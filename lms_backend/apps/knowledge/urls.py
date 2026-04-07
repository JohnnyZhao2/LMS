"""
Knowledge URLs.
API endpoints for knowledge document management.
"""
from django.urls import path

from .views import (
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    StudentTaskKnowledgeDetailView,
    ParseDocumentView,
)

urlpatterns = [
    # Knowledge endpoints
    path('', KnowledgeListCreateView.as_view(), name='knowledge-list-create'),
    path('parse-document/', ParseDocumentView.as_view(), name='parse-document'),
    path('task/<int:task_knowledge_id>/', StudentTaskKnowledgeDetailView.as_view(), name='student-task-knowledge-detail'),
    path('<int:pk>/', KnowledgeDetailView.as_view(), name='knowledge-detail'),
    path('<int:pk>/view/', KnowledgeIncrementViewCountView.as_view(), name='knowledge-view'),
]
