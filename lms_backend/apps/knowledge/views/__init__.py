"""
Knowledge views module.
Split into:
- knowledge.py: Knowledge document CRUD, stats
- document.py: Document parsing views
"""
from .knowledge import (
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    KnowledgeStatsView,
    StudentTaskKnowledgeDetailView,
)
from .document import (
    ParseDocumentView,
)

__all__ = [
    # Knowledge views
    'KnowledgeListCreateView',
    'KnowledgeDetailView',
    'KnowledgeStatsView',
    'StudentTaskKnowledgeDetailView',
    'KnowledgeIncrementViewCountView',
    # Document views
    'ParseDocumentView',
]
