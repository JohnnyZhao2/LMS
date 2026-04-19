"""Knowledge selectors."""

from typing import Optional

from django.db.models import Q, QuerySet

from .models import Knowledge


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
    if search:
        qs = qs.filter(Q(title__icontains=search) | Q(content__icontains=search))
    if ordering:
        qs = qs.order_by(ordering)
    return qs.distinct()
