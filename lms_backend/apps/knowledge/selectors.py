"""Knowledge selectors."""

import re
from typing import List, Optional

from django.db.models import Q, QuerySet

from .models import Knowledge


SEARCH_SPLIT_PATTERN = re.compile(r'[\s,，;；、|/]+')


def parse_knowledge_search_terms(search: Optional[str]) -> List[str]:
    if not search:
        return []

    terms = []
    seen = set()
    for term in SEARCH_SPLIT_PATTERN.split(search.strip()):
        normalized_term = term.strip()
        if not normalized_term or normalized_term in seen:
            continue
        terms.append(normalized_term)
        seen.add(normalized_term)
    return terms


def build_ordered_fuzzy_pattern(term: str) -> str:
    return '.*'.join(re.escape(char) for char in term)


def build_knowledge_search_query(term: str) -> Q:
    exact_query = (
        Q(title__icontains=term)
        | Q(content__icontains=term)
        | Q(space_tag__name__icontains=term)
        | Q(tags__name__icontains=term)
    )
    if len(term) < 2:
        return exact_query

    fuzzy_pattern = build_ordered_fuzzy_pattern(term)
    return exact_query | Q(title__iregex=fuzzy_pattern) | Q(content__iregex=fuzzy_pattern)


def knowledge_base_queryset() -> QuerySet:
    return Knowledge.objects.select_related(
        'created_by',
        'updated_by',
        'space_tag',
    ).prefetch_related('tags')


def get_knowledge_by_id(pk: int) -> Optional[Knowledge]:
    return knowledge_base_queryset().filter(pk=pk).first()


def get_knowledge_queryset(
    filters: dict = None,
    search: str = None,
    ordering: str = '-updated_at',
) -> QuerySet:
    qs = knowledge_base_queryset()
    if filters:
        if filters.get('space_tag_id') is not None:
            qs = qs.filter(space_tag_id=filters['space_tag_id'])
        if filters.get('tag_id'):
            qs = qs.filter(tags__id=filters['tag_id'])
    for term in parse_knowledge_search_terms(search):
        qs = qs.filter(build_knowledge_search_query(term))
    if ordering:
        qs = qs.order_by(ordering)
    return qs.distinct()
