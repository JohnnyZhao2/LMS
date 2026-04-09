"""Quiz selectors."""
from typing import Optional

from django.db.models import QuerySet

from .models import Quiz, QuizQuestion


def get_quiz_by_id(pk: int, include_deleted: bool = False) -> Optional[Quiz]:
    qs = Quiz.objects.select_related('created_by', 'updated_by').prefetch_related('quiz_questions__question')
    if not include_deleted:
        qs = qs.filter(is_deleted=False)
    return qs.filter(pk=pk).first()


def list_quiz_questions(quiz_id: int) -> QuerySet:
    return QuizQuestion.objects.filter(
        quiz_id=quiz_id
    ).select_related('question', 'quiz').order_by('order')
