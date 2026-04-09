"""
Question selectors.
集中管理题目查询与过滤逻辑。
"""
from typing import Optional

from django.db.models import QuerySet

from .models import Question


def question_base_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Question.objects.select_related('created_by', 'updated_by', 'space_tag').prefetch_related('tags')
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def get_question_by_id(pk: int, include_deleted: bool = False) -> Optional[Question]:
    return question_base_queryset(include_deleted=include_deleted).filter(pk=pk).first()


def apply_question_filters(
    qs: QuerySet,
    filters: dict = None,
    search: str = None
) -> QuerySet:
    if filters:
        if filters.get('resource_uuid'):
            qs = qs.filter(resource_uuid=filters['resource_uuid'])
        if filters.get('question_type'):
            qs = qs.filter(question_type=filters['question_type'])
        if filters.get('created_by_id'):
            qs = qs.filter(created_by_id=filters['created_by_id'])
        if filters.get('is_current') is not None:
            qs = qs.filter(is_current=filters['is_current'])
        if filters.get('space_tag_id') is not None:
            qs = qs.filter(space_tag_id=filters['space_tag_id'])
        if filters.get('tag_id') is not None:
            qs = qs.filter(tags__id=filters['tag_id'])
    if search:
        qs = qs.filter(content__icontains=search)
    return qs.distinct()
