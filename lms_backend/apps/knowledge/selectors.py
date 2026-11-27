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
        if filters.get('pinned'):
            qs = qs.filter(pinned_at__isnull=False)
            ordering = '-pinned_at'
        if filters.get('space_tag_id') is not None:
            qs = qs.filter(space_tag_id=filters['space_tag_id'])
        if filters.get('tag_ids'):
            for tid in filters['tag_ids']:
                qs = qs.filter(tags__id=tid)
        elif filters.get('tag_id'):
            qs = qs.filter(tags__id=filters['tag_id'])
    if search:
        qs = qs.filter(
            Q(title__icontains=search)
            | Q(section__icontains=search)
            | Q(summary__icontains=search)
            | Q(content__icontains=search)
            | Q(extra_search_text__icontains=search)
            | Q(tags__name__icontains=search)
            | Q(tags__category__icontains=search)
            | Q(space_tag__name__icontains=search)
        )
    if ordering:
        # -id：同秒更新时新建/后写入的仍靠前
        qs = qs.order_by(ordering, '-id')
    return qs.distinct()
