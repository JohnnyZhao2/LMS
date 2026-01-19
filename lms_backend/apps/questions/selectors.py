"""
Question selectors.
集中管理题目查询与过滤逻辑。
"""
from typing import Optional
from django.db.models import QuerySet
from django.contrib.contenttypes.models import ContentType
from .models import Question
from apps.knowledge.models import ResourceLineType


def question_base_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Question.objects.select_related('created_by', 'updated_by')
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
        if filters.get('question_type'):
            qs = qs.filter(question_type=filters['question_type'])
        if filters.get('created_by_id'):
            qs = qs.filter(created_by_id=filters['created_by_id'])
        if filters.get('is_current') is not None:
            qs = qs.filter(is_current=filters['is_current'])
        if filters.get('line_type_id'):
            question_content_type = ContentType.objects.get_for_model(Question)
            qs = qs.filter(
                id__in=ResourceLineType.objects.filter(
                    content_type=question_content_type,
                    line_type_id=filters['line_type_id']
                ).values_list('object_id', flat=True)
            )
    if search:
        qs = qs.filter(content__icontains=search)
    return qs
