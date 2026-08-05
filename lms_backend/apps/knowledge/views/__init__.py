"""
Knowledge views module.
"""
from .knowledge import (
    KnowledgeBulkDeleteView,
    KnowledgeBulkImportView,
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    StudentTaskKnowledgeDetailView,
)

__all__ = [
    'KnowledgeListCreateView',
    'KnowledgeBulkImportView',
    'KnowledgeBulkDeleteView',
    'KnowledgeDetailView',
    'StudentTaskKnowledgeDetailView',
    'KnowledgeIncrementViewCountView',
]
