"""
Knowledge views module.
"""
from .knowledge import (
    KnowledgeBulkDeleteView,
    KnowledgeBulkImportView,
    KnowledgeBulkUpdateView,
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    StudentTaskKnowledgeDetailView,
)

__all__ = [
    'KnowledgeListCreateView',
    'KnowledgeBulkImportView',
    'KnowledgeBulkUpdateView',
    'KnowledgeBulkDeleteView',
    'KnowledgeDetailView',
    'StudentTaskKnowledgeDetailView',
    'KnowledgeIncrementViewCountView',
]
