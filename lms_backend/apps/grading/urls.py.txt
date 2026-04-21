"""
Grading URLs.
"""
from django.urls import path

from .views import (
    GradingAnswersView,
    GradingQuestionsView,
    GradingSubmitView,
    PendingQuizzesView,
)

urlpatterns = [
    path('pending/', PendingQuizzesView.as_view(), name='grading-pending'),
    path('tasks/<int:task_id>/questions/', GradingQuestionsView.as_view(), name='grading-questions'),
    path('tasks/<int:task_id>/answers/', GradingAnswersView.as_view(), name='grading-answers'),
    path('tasks/<int:task_id>/submit/', GradingSubmitView.as_view(), name='grading-submit'),
]
