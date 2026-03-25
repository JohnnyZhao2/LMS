"""
Knowledge views module.
Split into:
- knowledge.py: Knowledge document CRUD, stats
- tags.py: Tag management views
- document.py: Document parsing views
"""
from .knowledge import (
    KnowledgeDetailView,
    KnowledgeIncrementViewCountView,
    KnowledgeListCreateView,
    KnowledgeStatsView,
    StudentTaskKnowledgeDetailView,
)
from .tags import (
    TagCreateView,
    TagDetailView,
    TagListView,
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
    # Tag views
    'TagListView',
    'TagCreateView',
    'TagDetailView',
    # Document views
    'ParseDocumentView',
]
