"""
Knowledge views module.
"""
from .knowledge import (
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    StudentTaskKnowledgeDetailView,
)

__all__ = [
    'KnowledgeListCreateView',
    'KnowledgeDetailView',
    'StudentTaskKnowledgeDetailView',
    'KnowledgeIncrementViewCountView',
]
