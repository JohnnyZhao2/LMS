"""
Knowledge views module.

Split into:
- knowledge.py: Knowledge document CRUD, publish/unpublish, stats
- tags.py: Tag management views
"""
from .knowledge import (
    KnowledgeListCreateView,
    KnowledgeDetailView,
    KnowledgePublishView,
    KnowledgeUnpublishView,
    KnowledgeStatsView,
    StudentKnowledgeListView,
    KnowledgeIncrementViewCountView,
)
from .tags import (
    TagListView,
    TagCreateView,
    TagDetailView,
)

__all__ = [
    # Knowledge views
    'KnowledgeListCreateView',
    'KnowledgeDetailView',
    'KnowledgePublishView',
    'KnowledgeUnpublishView',
    'KnowledgeStatsView',
    'StudentKnowledgeListView',
    'KnowledgeIncrementViewCountView',
    # Tag views
    'TagListView',
    'TagCreateView',
    'TagDetailView',
]
