"""
Knowledge selectors.
集中管理知识相关查询与过滤规则。
"""
from typing import Optional

from django.db.models import Q, QuerySet

from .models import Knowledge


def knowledge_base_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Knowledge.objects.select_related(
        'created_by',
        'updated_by',
        'line_tag',
    ).prefetch_related(
        'system_tags',
        'operation_tags'
    )
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def get_knowledge_by_id(pk: int, include_deleted: bool = False) -> Optional[Knowledge]:
    return knowledge_base_queryset(include_deleted=include_deleted).filter(pk=pk).first()


def get_knowledge_queryset(
    filters: dict = None,
    search: str = None,
    ordering: str = '-updated_at'
) -> QuerySet:
    qs = knowledge_base_queryset(include_deleted=False).filter(is_current=True)
    if filters:
        if filters.get('knowledge_type'):
            qs = qs.filter(knowledge_type=filters['knowledge_type'])
        if filters.get('line_tag_id') is not None:
            qs = qs.filter(line_tag_id=filters['line_tag_id'])
        if filters.get('system_tag_id'):
            qs = qs.filter(system_tags__id=filters['system_tag_id'])
        if filters.get('operation_tag_id'):
            qs = qs.filter(operation_tags__id=filters['operation_tag_id'])
    if search:
        qs = qs.filter(
            Q(title__icontains=search) |
            Q(content__icontains=search)
        )
    if ordering:
        qs = qs.order_by(ordering)
    return qs.distinct()
