"""
Quiz selectors.
集中管理试卷查询与关联读取。
"""
from typing import List, Optional

from django.db.models import QuerySet

from .models import Quiz, QuizQuestion


def quiz_base_queryset(include_deleted: bool = False) -> QuerySet:
    qs = Quiz.objects.select_related('created_by', 'updated_by').prefetch_related('quiz_questions__question')
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs


def get_quiz_by_id(pk: int, include_deleted: bool = False) -> Optional[Quiz]:
    return quiz_base_queryset(include_deleted=include_deleted).filter(pk=pk).first()


def list_quiz_questions(quiz_id: int) -> QuerySet:
    return QuizQuestion.objects.filter(
        quiz_id=quiz_id
    ).select_related('question', 'quiz').order_by('order')


def get_question_ids(quiz_id: int) -> List[int]:
    return list(
        QuizQuestion.objects.filter(quiz_id=quiz_id)
        .order_by('order')
        .values_list('question_id', flat=True)
    )
