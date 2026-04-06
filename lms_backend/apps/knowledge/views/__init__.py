"""
Knowledge views module.
Split into:
- knowledge.py: Knowledge document CRUD and task detail
- document.py: Document parsing views
"""
from .knowledge import (
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    StudentTaskKnowledgeDetailView,
)
from .document import (
    ParseDocumentView,
)

__all__ = [
    # Knowledge views
    'KnowledgeListCreateView',
    'KnowledgeDetailView',
    'StudentTaskKnowledgeDetailView',
    'KnowledgeIncrementViewCountView',
    # Document views
    'ParseDocumentView',
]
