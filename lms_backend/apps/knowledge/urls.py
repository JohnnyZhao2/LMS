"""
Knowledge URLs.

API endpoints for knowledge document and category management.

Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
"""
from django.urls import path

from .views import (
    KnowledgeCategoryListCreateView,
    KnowledgeCategoryDetailView,
    KnowledgeCategoryTreeView,
    KnowledgeListCreateView,
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
)

urlpatterns = [
    # Knowledge Category endpoints
    path('categories/', KnowledgeCategoryListCreateView.as_view(), name='category-list-create'),
    path('categories/tree/', KnowledgeCategoryTreeView.as_view(), name='category-tree'),
    path('categories/<int:pk>/', KnowledgeCategoryDetailView.as_view(), name='category-detail'),
    
    # Knowledge endpoints
    path('', KnowledgeListCreateView.as_view(), name='knowledge-list-create'),
    path('<int:pk>/', KnowledgeDetailView.as_view(), name='knowledge-detail'),
    path('<int:pk>/view/', KnowledgeIncrementViewCountView.as_view(), name='knowledge-view'),
]
