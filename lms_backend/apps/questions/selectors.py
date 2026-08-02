"""Question selectors."""

from django.db.models import Count, Prefetch, QuerySet

from .models import Question, QuestionOption


def question_base_queryset() -> QuerySet:
    return Question.objects.select_related(
        'created_by',
        'updated_by',
        'space_tag',
    ).prefetch_related(
        Prefetch(
            'question_options',
            queryset=QuestionOption.objects.order_by('sort_order', 'id'),
        ),
        'tags',
    ).annotate(
        usage_count=Count('quiz_relations', distinct=True),
    )


def apply_question_filters(
    qs: QuerySet,
    filters: dict = None,
    search: str = None,
) -> QuerySet:
    if filters:
        if filters.get('question_type'):
            qs = qs.filter(question_type=filters['question_type'])
        if filters.get('created_by_id'):
            qs = qs.filter(created_by_id=filters['created_by_id'])
        if filters.get('space_tag_id') is not None:
            qs = qs.filter(space_tag_id=filters['space_tag_id'])
        if filters.get('tag_id') is not None:
            qs = qs.filter(tags__id=filters['tag_id'])
    if search:
        qs = qs.filter(content__icontains=search)
    return qs.distinct()
